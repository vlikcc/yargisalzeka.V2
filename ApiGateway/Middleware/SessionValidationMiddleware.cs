using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Caching.Memory;
using System.Net.Http.Json;

namespace ApiGateway.Middleware
{
    public class SessionValidationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SessionValidationMiddleware> _logger;

        public SessionValidationMiddleware(RequestDelegate next, IMemoryCache cache, IHttpClientFactory httpClientFactory, ILogger<SessionValidationMiddleware> logger)
        {
            _next = next;
            _cache = cache;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Skip session validation for auth endpoints (login, register) and health checks
            var path = context.Request.Path.Value?.ToLower();
            if (path != null && (path.Contains("/auth/login") || path.Contains("/auth/register") || path.Contains("/health")))
            {
                await _next(context);
                return;
            }

            string? token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jsonToken = handler.ReadToken(token) as JwtSecurityToken;

                    if (jsonToken != null)
                    {
                        var sessionId = jsonToken.Claims.FirstOrDefault(c => c.Type == "sid")?.Value;

                        if (string.IsNullOrEmpty(sessionId))
                        {
                            // Token has no session ID (legacy token) -> Reject to force re-login
                            context.Response.StatusCode = 401;
                            await context.Response.WriteAsJsonAsync(new { Message = "Session expired (missing sid). Please login again." });
                            return;
                        }

                        // Check Cache
                        if (!_cache.TryGetValue($"session_{sessionId}", out bool isValid))
                        {
                            // Validate with IdentityService
                            var client = _httpClientFactory.CreateClient("IdentityService");
                            // Note: IdentityService URL needs to be configured or hardcoded for internal docker network
                            // Using the service name from docker-compose
                            
                            var response = await client.PostAsJsonAsync("http://identityservice:5001/api/auth/validate-session", new { SessionId = sessionId });

                            if (response.IsSuccessStatusCode)
                            {
                                isValid = true;
                                _cache.Set($"session_{sessionId}", true, TimeSpan.FromMinutes(1)); // Cache for 1 minute
                            }
                            else
                            {
                                isValid = false;
                                // Cache invalid result for shorter time or don't cache to allow immediate retry if fixed?
                                // Better to not cache invalid result heavily or cache for short time
                                _cache.Set($"session_{sessionId}", false, TimeSpan.FromSeconds(30));
                            }
                        }

                        if (!isValid)
                        {
                            context.Response.StatusCode = 401;
                            await context.Response.WriteAsJsonAsync(new { Message = "Session invalid or expired. Please login again." });
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error validating session");
                    // On error, do we block or allow? Safe default is block or skip.
                    // If we block, system outage blocks everyone.
                    // For now, let's block to be safe secure-wise, but log it.
                    // Or actually, simple JWT parse error -> 401
                }
            }

            await _next(context);
        }
    }
}
