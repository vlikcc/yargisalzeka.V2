using AIService.Models;
using AIService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net.Http.Json;

namespace AIService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Authentication gerekli
public class GeminiController : ControllerBase
{
    private readonly IGeminiAiService _service;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _factory;
    private readonly ILogger<GeminiController> _logger;

    public GeminiController(IGeminiAiService service, IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<GeminiController> logger)
    {
        _service = service;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _factory = httpClientFactory;
        _logger = logger;
    }

    [HttpPost("extract-keywords")]
    [ProducesResponseType(typeof(KeywordExtractionResponse), 200)]
    public async Task<IActionResult> ExtractKeywords([FromBody] KeywordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var sub = _factory.CreateClient("Subscription");
        var token = Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
        var access = await sub.GetFromJsonAsync<ValidateAccessDto>($"api/subscription/usage");
        if (access == null) return StatusCode(502, "Subscription service unreachable");
        if (access.KeywordExtractionRemaining == 0) return Forbid("Limit tükendi");
        var keywords = await _service.ExtractKeywordsFromCaseAsync(request.CaseText);
        if (keywords.Count > 0)
        {
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.KeywordExtraction });
        }
        else
        {
            _logger.LogInformation("Keyword extraction fallback/empty result - quota not consumed (user {UserId})", userId);
        }
        // Tutarlı JSON shape
        return Ok(new KeywordExtractionResponse { Keywords = keywords });
    }

    [HttpPost("analyze-relevance")]
    [ProducesResponseType(typeof(RelevanceResponse), 200)]
    public async Task<IActionResult> AnalyzeRelevance([FromBody] RelevanceRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
    var sub = _factory.CreateClient("Subscription");
    var token = Request.Headers["Authorization"].ToString();
    if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
    var access = await sub.GetFromJsonAsync<ValidateAccessDto>("api/subscription/usage");
    if (access == null) return StatusCode(502, "Subscription service unreachable");
    if (access.CaseAnalysisRemaining == 0) return Forbid("Limit tükendi");
        var result = await _service.AnalyzeDecisionRelevanceAsync(request.CaseText, request.DecisionText);
        if (!string.Equals(result.Explanation, "Analiz sırasında hata oluştu", StringComparison.OrdinalIgnoreCase))
        {
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.CaseAnalysis });
        }
        else
        {
            _logger.LogInformation("Relevance analysis fallback - quota not consumed (user {UserId})", userId);
        }
        return Ok(result);
    }

    [HttpPost("generate-petition")]
    [ProducesResponseType(typeof(string), 200)]
    public async Task<IActionResult> GeneratePetition([FromBody] PetitionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
    var sub = _factory.CreateClient("Subscription");
    var token = Request.Headers["Authorization"].ToString();
    if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
    var access = await sub.GetFromJsonAsync<ValidateAccessDto>("api/subscription/usage");
    if (access == null) return StatusCode(502, "Subscription service unreachable");
    if (access.PetitionRemaining == 0) return Forbid("Limit tükendi");
        var result = await _service.GeneratePetitionTemplateAsync(request.CaseText, request.RelevantDecisions);
        if (!string.IsNullOrWhiteSpace(result) && !result.StartsWith("Dilekçe şablonu oluşturulamadı", StringComparison.OrdinalIgnoreCase))
        {
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.Petition });
        }
        else
        {
            _logger.LogInformation("Petition generation fallback - quota not consumed (user {UserId})", userId);
        }
        return Ok(result);
    }

    [HttpPost("search-decisions")]
    [ProducesResponseType(typeof(List<DecisionSearchResult>), 200)]
    public async Task<IActionResult> SearchDecisions([FromBody] SearchDecisionsRequest request)
    {
        var baseUrl = _configuration["SearchService:BaseUrl"] ?? "http://localhost:5043";
        var client = _httpClientFactory.CreateClient();
        var response = await client.PostAsJsonAsync($"{baseUrl}/api/search", request);
        if (!response.IsSuccessStatusCode)
        {
            return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
        }
        
        // SearchService'den gelen DecisionDto'yu DecisionSearchResult'a mapping yap
        var searchResults = await response.Content.ReadFromJsonAsync<List<SearchServiceDecisionDto>>();
        if (searchResults == null)
        {
            return Ok(new List<DecisionSearchResult>());
        }

        var results = searchResults.Select(d => new DecisionSearchResult
        {
            Id = d.Id,
            Title = $"Yargıtay {d.YargitayDairesi} - {d.EsasNo}/{d.KararNo}",
            Excerpt = d.KararMetni.Length > 300 ? d.KararMetni.Substring(0, 300) + "..." : d.KararMetni,
            DecisionDate = d.KararTarihi, // Nullable DateTime
            Court = d.YargitayDairesi
        }).ToList();

        return Ok(results);
    }

    [HttpPost("analyze-case")]
    [ProducesResponseType(typeof(CaseAnalysisResponse), 200)]
    public async Task<IActionResult> AnalyzeCase([FromBody] CaseAnalysisRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            var sub = _factory.CreateClient("Subscription");
            var token = Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
            ValidateAccessDto? access = null;
            try
            {
                access = await sub.GetFromJsonAsync<ValidateAccessDto>("api/subscription/usage");
            }
            catch (Exception exAccess)
            {
                _logger.LogError(exAccess, "Subscription usage endpoint hatası");
            }
            if (access == null) return StatusCode(502, "Subscription service unreachable");
            if (access == null)
            {
                _logger.LogWarning("AnalyzeCase subscription usage yanıtı null döndü");
                return StatusCode(502, new { error = "Subscription service unreachable (usage null)" });
            }
            if (access.CaseAnalysisRemaining == 0) return Forbid("Limit tükendi");
            var result = await _service.AnalyzeCaseTextAsync(request.CaseText);
            if (!string.IsNullOrWhiteSpace(result.AnalysisResult) && !string.Equals(result.AnalysisResult, "Olay metni analiz hatası", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.CaseAnalysis });
                }
                catch (Exception exConsume)
                {
                    _logger.LogWarning(exConsume, "CaseAnalysis consume çağrısı başarısız ancak analiz sonucu kullanıcıya dönüyor (userId bilinmiyor olabilir)");
                }
            }
            else
            {
                _logger.LogInformation("Case analysis fallback - quota not consumed (user {UserId})", userId);
            }
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AnalyzeCase endpoint genel hata");
            return StatusCode(500, new { error = "Analyze-case işlem hatası" });
        }
    }

    [HttpPost("test-token")]
    [AllowAnonymous] // Bu endpoint için authentication gerekmez
    [ProducesResponseType(typeof(string), 200)]
    public async Task<IActionResult> GenerateTestToken([FromBody] TestTokenRequest request)
    {
        var tokenService = HttpContext.RequestServices.GetRequiredService<IJwtTokenService>();
        var token = tokenService.GenerateToken(request.UserId, request.Email);
    await Task.CompletedTask; // keep method truly async for extensibility
    return Ok(new { token });
    }

    // SearchService'den gelen DecisionDto için internal model
    private class SearchServiceDecisionDto
    {
        public long Id { get; set; }
        public string YargitayDairesi { get; set; } = string.Empty;
        public string EsasNo { get; set; } = string.Empty;
        public string KararNo { get; set; } = string.Empty;
        public DateTime KararTarihi { get; set; }
        public string KararMetni { get; set; } = string.Empty;
    }

    private class ValidateAccessDto
    {
        public int KeywordExtractionRemaining { get; set; }
        public int CaseAnalysisRemaining { get; set; }
        public int SearchRemaining { get; set; }
        public int PetitionRemaining { get; set; }
    }
}
