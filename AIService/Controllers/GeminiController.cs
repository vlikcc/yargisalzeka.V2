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
    [ProducesResponseType(typeof(KeywordExtractionSearchResponse), 200)]
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

        // Ardından SearchService'e keywords ile arama yap
        List<DecisionSearchResult> mapped = new();
        int total = 0;
        try
        {
            if (keywords.Count > 0)
            {
                var searchBase = _configuration["SearchService:BaseUrl"] ?? "http://localhost:5043";
                var searchClient = _httpClientFactory.CreateClient();
                if (!string.IsNullOrEmpty(token)) searchClient.DefaultRequestHeaders.Add("Authorization", token);
                var searchResp = await searchClient.PostAsJsonAsync($"{searchBase}/api/search", new { keywords });
                if (searchResp.IsSuccessStatusCode)
                {
                    // SearchService artık SimpleSearchResponse döndürüyor: { decisions: [...], totalResults: n }
                    var json = await searchResp.Content.ReadAsStringAsync();
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("decisions", out var decisionsEl))
                        {
                            foreach (var d in decisionsEl.EnumerateArray())
                            {
                                var id = d.GetProperty("id").GetInt64();
                                var yargitay = d.GetProperty("yargitayDairesi").GetString() ?? string.Empty;
                                var esas = d.GetProperty("esasNo").GetString() ?? string.Empty;
                                var kararNo = d.GetProperty("kararNo").GetString() ?? string.Empty;
                                DateTime? kararTarihi = null;
                                if (d.TryGetProperty("kararTarihi", out var kt) && kt.ValueKind != System.Text.Json.JsonValueKind.Null)
                                {
                                    if (DateTime.TryParse(kt.ToString(), out var dt)) kararTarihi = dt;
                                }
                                var metin = d.GetProperty("kararMetni").GetString() ?? string.Empty;
                                mapped.Add(new DecisionSearchResult
                                {
                                    Id = id,
                                    Title = $"Yargıtay {yargitay} - {esas}/{kararNo}",
                                    Excerpt = metin.Length > 300 ? metin.Substring(0, 300) + "..." : metin,
                                    DecisionDate = kararTarihi,
                                    Court = yargitay
                                });
                            }
                        }
                        if (root.TryGetProperty("totalResults", out var totalEl) && totalEl.ValueKind == System.Text.Json.JsonValueKind.Number)
                        {
                            total = totalEl.GetInt32();
                        }
                    }
                    catch (Exception exMap)
                    {
                        _logger.LogWarning(exMap, "SearchService response parse hatası (extract-keywords chain)");
                    }
                }
                else
                {
                    _logger.LogWarning("SearchService arama başarısız status={Status}", searchResp.StatusCode);
                }
            }
        }
        catch (Exception exSearch)
        {
            _logger.LogWarning(exSearch, "Extract-keywords sonrası otomatik arama hata");
        }

        return Ok(new KeywordExtractionSearchResponse
        {
            Keywords = keywords,
            Decisions = mapped,
            TotalResults = total
        });
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

    // Birleşik uç nokta: olay metni -> analiz, keyword extraction, search, relevance scoring (top 3)
    [HttpPost("composite-search")] // api/gemini/composite-search
    [ProducesResponseType(typeof(CompositeSearchResponse), 200)]
    public async Task<IActionResult> CompositeSearch([FromBody] CompositeSearchRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (string.IsNullOrWhiteSpace(request.CaseText)) return BadRequest("Olay metni gerekli.");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

    // Zaman bütçesi kullanımını kaldırdık: önceki stopwatch / RemainingBudget mantığı temizlendi.

        var token = Request.Headers["Authorization"].ToString();
        var sub = _factory.CreateClient("Subscription");
        if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
        ValidateAccessDto? usage = null;
        try { usage = await sub.GetFromJsonAsync<ValidateAccessDto>("api/subscription/usage"); } catch { }
        if (usage == null) return StatusCode(502, "Subscription service unreachable");
        if (usage.CaseAnalysisRemaining == 0 || usage.KeywordExtractionRemaining == 0 || usage.SearchRemaining == 0)
            return Forbid("Limit tükendi (analysis/keywords/search)");

        // 1 & 2: Analiz ve keyword extraction paralel
        // Zaman bütçesi yerine doğrudan çağrılar (gerekirse ileride sabit timeout eklenebilir)
        async Task<CaseAnalysisResponse?> RunAnalysis()
        {
            try { return await _service.AnalyzeCaseTextAsync(request.CaseText); }
            catch { return new CaseAnalysisResponse { AnalysisResult = "Analiz hatası" }; }
        }
        async Task<List<string>> RunKeywords()
        {
            try { return await _service.ExtractKeywordsFromCaseAsync(request.CaseText); }
            catch { return new List<string>(); }
        }

        var analysisTask = RunAnalysis();
        var keywordsTask = RunKeywords();
        await Task.WhenAll(analysisTask, keywordsTask);
        var analysis = (await analysisTask)?.AnalysisResult ?? string.Empty;
        var keywords = (await keywordsTask) ?? new List<string>();
        if (keywords.Count == 0)
        {
            keywords = request.CaseText
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(w => w.Length > 3)
                .Take(5)
                .ToList();
        }

        // Önceden burada kalan zaman kontrolü vardı; kaldırıldı.

        // 3: SearchService çağrısı
        var searchBase = _configuration["SearchService:BaseUrl"]; 
        var searchClient = _httpClientFactory.CreateClient();
        if (!string.IsNullOrEmpty(token)) searchClient.DefaultRequestHeaders.Add("Authorization", token);
        List<SearchServiceDecisionDto>? decisionsRaw = null;
        Console.WriteLine($"CompositeSearch keywords: {string.Join(", ", keywords)}");
        Console.WriteLine(searchBase);
        try
        {
            var searchResp = await searchClient.PostAsJsonAsync($"{searchBase}/api/search", new { keywords });
            if (searchResp.IsSuccessStatusCode)
            {
                // SimpleSearchResponse: decisions, totalResults
                using var doc = System.Text.Json.JsonDocument.Parse(await searchResp.Content.ReadAsStringAsync());
                if (doc.RootElement.TryGetProperty("decisions", out var decEl))
                {
                    decisionsRaw = decEl.EnumerateArray().Select(d => new SearchServiceDecisionDto
                    {
                        Id = d.GetProperty("id").GetInt64(),
                        YargitayDairesi = d.GetProperty("yargitayDairesi").GetString() ?? string.Empty,
                        EsasNo = d.GetProperty("esasNo").GetString() ?? string.Empty,
                        KararNo = d.GetProperty("kararNo").GetString() ?? string.Empty,
                        KararMetni = d.GetProperty("kararMetni").GetString() ?? string.Empty,
                        KararTarihi = d.TryGetProperty("kararTarihi", out var kt) && kt.ValueKind != System.Text.Json.JsonValueKind.Null && DateTime.TryParse(kt.ToString(), out var dt) ? dt : (DateTime?)null
                    }).ToList();
                }
            }
            else
            {
                _logger.LogWarning("CompositeSearch: SearchService hata status={Status}", searchResp.StatusCode);
            }
        }
        catch (Exception exSearch)
        {
            _logger.LogWarning(exSearch, "CompositeSearch Search çağrısı hata");
        }
        decisionsRaw ??= new List<SearchServiceDecisionDto>();

        // 4: Relevance scoring (top N veya hepsi - biz max 12 alalım)
        var maxScore = int.TryParse(Environment.GetEnvironmentVariable("COMPOSITE_SCORE_MAX"), out var tmpMax) ? Math.Clamp(tmpMax, 1, 30) : 8; // düşürüldü
        var toScore = decisionsRaw.Take(maxScore).ToList();
        var scored = new List<ScoredDecisionResult>();
        var semaphore = new SemaphoreSlim(3);
        var tasks = toScore.Select(async d =>
        {
            await semaphore.WaitAsync();
            try
            {
                var rel = await _service.AnalyzeDecisionRelevanceAsync(request.CaseText, d.KararMetni);
                if (rel != null)
                {
                    lock (scored)
                    {
                        scored.Add(new ScoredDecisionResult
                        {
                            Id = d.Id,
                            Title = $"Yargıtay {d.YargitayDairesi} - {d.EsasNo}/{d.KararNo}",
                            Excerpt = d.KararMetni.Length > 300 ? d.KararMetni.Substring(0, 300) + "..." : d.KararMetni,
                            DecisionDate = d.KararTarihi,
                            Court = d.YargitayDairesi,
                            Score = rel.Score,
                            RelevanceExplanation = rel.Explanation,
                            RelevanceSimilarity = rel.Similarity
                        });
                    }
                }
            }
            catch (Exception exRel)
            {
                _logger.LogDebug(exRel, "Relevance scoring hata (composite)");
            }
            finally { semaphore.Release(); }
        });
        await Task.WhenAll(tasks);

        var top3 = scored
            .OrderByDescending(s => s.Score ?? int.MinValue)
            .ThenByDescending(s => s.DecisionDate)
            .Take(3)
            .ToList();

    // Zaman ölçümü kaldırıldı.

        // Quota consumption (analysis + keyword + search + relevance as case analysis) - en azından birer tane düşelim.
        try
        {
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.CaseAnalysis });
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.KeywordExtraction });
            await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = FeatureTypes.Search });
        }
        catch (Exception exConsume)
        {
            _logger.LogWarning(exConsume, "CompositeSearch quota consumption hata");
        }

        return Ok(new CompositeSearchResponse
        {
            Analysis = analysis,
            Keywords = keywords,
            Decisions = top3
        });
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
        public DateTime? KararTarihi { get; set; }
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
