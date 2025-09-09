using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SearchService.DbContexts;
using SearchService.Models;
using SearchService.Services;
using System.Security.Claims;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace SearchService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class KeywordSearchController : ControllerBase
{
    private readonly ILogger<KeywordSearchController> _logger;
    private readonly IHttpClientFactory _factory;
    private readonly SearchDbContext _db;
    private readonly ISearchProvider _searchProvider;

    public KeywordSearchController(
        ILogger<KeywordSearchController> logger,
        IHttpClientFactory factory,
        SearchDbContext db,
        ISearchProvider searchProvider)
    {
        _logger = logger;
        _factory = factory;
        _db = db;
        _searchProvider = searchProvider;
    }

    [HttpPost]
    [ProducesResponseType(typeof(SearchResponse), 200)]
    public async Task<IActionResult> Search([FromBody] SearchRequest request, CancellationToken cancellationToken)
    {
        // Keywords zorunlu
        if (request.Keywords == null || request.Keywords.Count == 0)
        {
            return BadRequest("En az bir anahtar kelime gerekli.");
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        // Abonelik kontrolü
        var sub = _factory.CreateClient("Subscription");
        var token = Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
        var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage");
        if (usage == null) return StatusCode(502, "Subscription service unreachable");
        if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

        // Anahtar kelimeleri temizle ve benzersizleştir
        var keywords = request.Keywords
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(k => k.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (keywords.Count == 0)
        {
            return BadRequest("Geçerli anahtar kelime bulunamadı.");
        }

        // Kararları ara
        var results = await _searchProvider.SearchAsync(keywords, cancellationToken);

        // DTO'ya dönüştür
        var decisionsDto = results.Select(d => new DecisionDto(
            Id: d.Id,
            YargitayDairesi: d.YargitayDairesi,
            EsasNo: d.EsasNo,
            KararNo: d.KararNo,
            KararTarihi: d.KararTarihi,
            KararMetni: d.KararMetni
        )).ToList();

        var response = new SearchResponse(
            Decisions: decisionsDto,
            Analysis: new CaseAnalysisResponse(""), // Frontend'de analiz yapıldı
            Keywords: new KeywordExtractionResult(keywords),
            TotalResults: decisionsDto.Count
        );

        // Search log oluştur
        var entry = new SearchService.Entities.SearchLog
        {
            UserId = userId,
            CaseText = string.Join(" ", keywords),
            AnalysisResult = null,
            Keywords = keywords,
            ResultCount = decisionsDto.Count,
            TopDecisionIds = results.Take(5).Select(d => d.Id).ToArray(),
            CreatedAt = DateTime.UtcNow
        };
        _db.SearchLogs.Add(entry);

        // Kullanım hakkını düş
        await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Search" });
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(response);
    }
}

// DTO for subscription service
public class UsageStatsDto
{
    public int SearchRemaining { get; set; }
}
