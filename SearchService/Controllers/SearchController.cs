using Microsoft.AspNetCore.Mvc;
using SearchService.Models;
using SearchService.Services;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Json;
using System.Security.Claims;
using SearchService.DbContexts;
using Microsoft.EntityFrameworkCore;
using SearchService.Entities;

namespace SearchService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
	private readonly ISearchProvider _searchProvider;
	private readonly ILogger<SearchController> _logger;
	private readonly IHttpClientFactory _factory;
    private readonly SearchDbContext _db;

	public SearchController(ISearchProvider searchProvider, ILogger<SearchController> logger, IHttpClientFactory factory, SearchDbContext db)
	{
		_searchProvider = searchProvider;
		_logger = logger;
		_factory = factory;
        _db = db;
	}

	[HttpPost]
	[ProducesResponseType(typeof(SearchResponse), 200)]
	public async Task<IActionResult> Search([FromBody] SearchRequest request, CancellationToken cancellationToken)
	{
		if (string.IsNullOrWhiteSpace(request.CaseText))
		{
			return BadRequest("Olay metni gerekli.");
		}

		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();

		// Subscription check
		var sub = _factory.CreateClient("Subscription");
		var token = Request.Headers["Authorization"].ToString();
		if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
		var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage");
		if (usage == null) return StatusCode(502, "Subscription service unreachable");
		if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

		// AI Service'den hem keywords hem de case analysis al
		var aiClient = _factory.CreateClient("AIService");
		if (!string.IsNullOrEmpty(token)) aiClient.DefaultRequestHeaders.Add("Authorization", token);
		
		List<string> keywords;
		string caseAnalysis;
		
		try
		{
			// Keywords extraction
			var keywordRequest = new KeywordExtractionRequest(request.CaseText);
			var keywordResponse = await aiClient.PostAsJsonAsync("api/gemini/extract-keywords", keywordRequest, cancellationToken);
			
			if (!keywordResponse.IsSuccessStatusCode)
			{
				_logger.LogError("AI Service keyword extraction failed: {StatusCode} - {Content}", 
					keywordResponse.StatusCode, await keywordResponse.Content.ReadAsStringAsync());
				return StatusCode(502, "Anahtar kelime çıkarma işlemi başarısız");
			}

			keywords = await keywordResponse.Content.ReadFromJsonAsync<List<string>>(cancellationToken: cancellationToken) ?? new List<string>();
			
			// Case analysis
			var analysisRequest = new { CaseText = request.CaseText };
			var analysisResponse = await aiClient.PostAsJsonAsync("api/gemini/analyze-case", analysisRequest, cancellationToken);
			
			if (!analysisResponse.IsSuccessStatusCode)
			{
				_logger.LogError("AI Service case analysis failed: {StatusCode} - {Content}", 
					analysisResponse.StatusCode, await analysisResponse.Content.ReadAsStringAsync());
				return StatusCode(502, "Olay analizi işlemi başarısız");
			}

			var analysisResult = await analysisResponse.Content.ReadFromJsonAsync<CaseAnalysisResponse>(cancellationToken: cancellationToken);
			caseAnalysis = analysisResult?.AnalysisResult ?? "Analiz tamamlanamadı";
			
			if (keywords.Count == 0)
			{
				_logger.LogWarning("No keywords extracted from case text");
				keywords = new List<string>(); // Boş liste olarak devam et
			}
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "AI Service communication failed");
			return StatusCode(502, "AI servisi ile iletişim kurulamadı");
		}

		// Search with extracted keywords (boş olsa bile çalışır)
		var results = await _searchProvider.SearchAsync(keywords, cancellationToken);
		await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Search" });

		// Store history
		try
		{
			var history = new SearchHistory
			{
				UserId = userId,
				Keywords = string.Join(",", keywords),
				ResultCount = results.Count,
				CreatedAt = DateTime.UtcNow
			};
			_db.SearchHistories.Add(history);
			await _db.SaveChangesAsync(cancellationToken);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Arama geçmişi kaydedilemedi");
		}

		// Kapsamlı response döndür
		var response = new SearchResponse(
			Decisions: results,
			Analysis: new CaseAnalysisResponse(caseAnalysis),
			Keywords: new KeywordExtractionResult(keywords),
			TotalResults: results.Count
		);

		return Ok(response);
	}

	// GET api/search/history?take=20
	[HttpGet("history")]
	[ProducesResponseType(typeof(List<SearchHistoryDto>), 200)]
	public async Task<IActionResult> GetHistory([FromQuery] int take = 20)
	{
		take = Math.Clamp(take, 1, 100);
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();
		var items = await _db.SearchHistories
			.Where(h => h.UserId == userId)
			.OrderByDescending(h => h.CreatedAt)
			.Take(take)
			.Select(h => new SearchHistoryDto(h.Id, h.Keywords.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(), h.ResultCount, h.CreatedAt))
			.ToListAsync();
		return Ok(items);
	}

	// POST api/search/save/{decisionId}
	[HttpPost("save/{decisionId:long}")]
	public async Task<IActionResult> SaveDecision(long decisionId)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();
		var exists = await _db.SavedDecisions.AnyAsync(x => x.UserId == userId && x.DecisionId == decisionId);
		if (exists) return Conflict("Karar zaten kaydedilmiş.");
		_db.SavedDecisions.Add(new SavedDecision { UserId = userId, DecisionId = decisionId, SavedAt = DateTime.UtcNow });
		await _db.SaveChangesAsync();
		return Ok();
	}

	// DELETE api/search/save/{decisionId}
	[HttpDelete("save/{decisionId:long}")]
	public async Task<IActionResult> RemoveSaved(long decisionId)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();
		var entity = await _db.SavedDecisions.FirstOrDefaultAsync(x => x.UserId == userId && x.DecisionId == decisionId);
		if (entity == null) return NotFound();
		_db.SavedDecisions.Remove(entity);
		await _db.SaveChangesAsync();
		return NoContent();
	}

	// GET api/search/saved
	[HttpGet("saved")]
	[ProducesResponseType(typeof(List<SavedDecisionDto>), 200)]
	public async Task<IActionResult> GetSaved([FromQuery] int take = 50)
	{
		take = Math.Clamp(take, 1, 200);
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();
		var items = await _db.SavedDecisions
			.Where(s => s.UserId == userId)
			.OrderByDescending(s => s.SavedAt)
			.Take(take)
			.Select(s => new SavedDecisionDto(s.DecisionId, s.SavedAt))
			.ToListAsync();
		return Ok(items);
	}
}

public class UsageStatsDto
{
	public int KeywordExtractionRemaining { get; set; }
	public int CaseAnalysisRemaining { get; set; }
	public int SearchRemaining { get; set; }
	public int PetitionRemaining { get; set; }
}

public record SearchHistoryDto(long Id, List<string> Keywords, int ResultCount, DateTime CreatedAt);
public record SavedDecisionDto(long DecisionId, DateTime SavedAt);


