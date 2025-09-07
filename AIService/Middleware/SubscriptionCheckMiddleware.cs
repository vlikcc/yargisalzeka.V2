using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net.Http.Json;

namespace AIService.Middleware;

public class SubscriptionCheckMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SubscriptionCheckMiddleware> _logger;

    public SubscriptionCheckMiddleware(RequestDelegate next, ILogger<SubscriptionCheckMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Sadece Gemini endpoint'lerini kontrol et (test-token hariç)
        if (context.Request.Path.StartsWithSegments("/api/Gemini") && 
            !context.Request.Path.StartsWithSegments("/api/Gemini/test-token"))
        {
            try
            {
                // JWT token'dan user ID'yi al
                var userId = GetUserIdFromToken(context);
                if (string.IsNullOrEmpty(userId))
                {
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new { error = "Geçersiz token" });
                    return;
                }

                // Abonelik durumunu SubscriptionService REST üzerinden kontrol et
                var client = context.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("Subscription");
                var bearer = context.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrEmpty(bearer)) client.DefaultRequestHeaders.Add("Authorization", bearer);

                object? current = null;
                try
                {
                    current = await client.GetFromJsonAsync<object>("api/subscription/current");
                }
                catch (Exception exFetchCurrent)
                {
                    _logger.LogError(exFetchCurrent, "Subscription service 'current' endpoint erişim hatası");
                }
                if (current == null)
                {
                    context.Response.StatusCode = 502;
                    await context.Response.WriteAsJsonAsync(new { error = "Aktif abonelik yok veya Subscription service ulaşılamıyor" });
                    return;
                }

                CheckStatusDto? remaining = null;
                try
                {
                    remaining = await client.GetFromJsonAsync<CheckStatusDto>("api/subscription/remaining-credits");
                }
                catch (Exception exFetchRemaining)
                {
                    _logger.LogError(exFetchRemaining, "Subscription service 'remaining-credits' endpoint erişim hatası");
                }
                if (remaining == null)
                {
                    context.Response.StatusCode = 502;
                    await context.Response.WriteAsJsonAsync(new { error = "Subscription service not reachable" });
                    return;
                }
                bool anyUnlimited = remaining.KeywordExtraction == -1 || remaining.CaseAnalysis == -1 || remaining.Search == -1 || remaining.Petition == -1;
                int minRemaining = new[] { remaining.KeywordExtraction, remaining.CaseAnalysis, remaining.Search, remaining.Petition }
                    .Where(x => x >= 0)
                    .DefaultIfEmpty(int.MaxValue)
                    .Min();
                if (!anyUnlimited && minRemaining <= 0)
                {
                    context.Response.StatusCode = 403;
                    await context.Response.WriteAsJsonAsync(new { error = "Yeterli krediniz bulunmamaktadır" });
                    return;
                }

                _logger.LogInformation("Kullanıcı {UserId} için abonelik kontrolü başarılı.", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Abonelik kontrolü sırasında beklenmeyen hata");
                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(new { error = "Abonelik kontrolü sırasında beklenmeyen hata" });
                return;
            }
        }

        await _next(context);
    }

    private string? GetUserIdFromToken(HttpContext context)
    {
        try
        {
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return null;
            }

            var token = authHeader.Substring("Bearer ".Length);
            var handler = new JwtSecurityTokenHandler();
            var jsonToken = handler.ReadJwtToken(token);

            var userIdClaim = jsonToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "sub");
            return userIdClaim?.Value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token'dan user ID alınırken hata oluştu");
            return null;
        }
    }
}

public class CheckStatusDto
{
    public int KeywordExtraction { get; set; }
    public int CaseAnalysis { get; set; }
    public int Search { get; set; }
    public int Petition { get; set; }
}
