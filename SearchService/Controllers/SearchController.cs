using Microsoft.AspNetCore.Mvc;
using SearchService.Models;
using SearchService.Services;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Json;
using System.Security.Claims;
using SearchService.DbContexts;
using Microsoft.EntityFrameworkCore;
using SearchService.Entities;
using System.Collections.Concurrent;

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
	private readonly SearchProcessingStore _store;

	public SearchController(ISearchProvider searchProvider, ILogger<SearchController> logger, IHttpClientFactory factory, SearchDbContext db, SearchProcessingStore store)
	{
		_searchProvider = searchProvider;
		_logger = logger;
		_factory = factory;
        _db = db;
		_store = store;
	}

	[HttpPost]
	[ProducesResponseType(typeof(SimpleSearchResponse), 200)]
	public async Task<IActionResult> Search([FromBody] SearchRequest request, CancellationToken cancellationToken)
	{
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();

		var keywords = request.Keywords
			.Where(k => !string.IsNullOrWhiteSpace(k))
			.Select(k => k.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();
		if (keywords.Count == 0) return BadRequest("Anahtar kelime gerekli.");
		Console.WriteLine($"Search keywords: {string.Join(", ", keywords)}");
		var sub = _factory.CreateClient("Subscription");
		var token = Request.Headers["Authorization"].ToString();
		if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
		var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage", cancellationToken);
		if (usage == null) return StatusCode(502, "Subscription service unreachable");
		if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

		var results = await _searchProvider.SearchAsync(keywords, cancellationToken);

		await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Search" });

		try
		{
			var history = new SearchHistory
			{
				UserId = userId,
				Keywords = string.Join(',', keywords),
				ResultCount = results.Count,
				CreatedAt = DateTime.UtcNow
			};
			_db.SearchHistories.Add(history);
			await _db.SaveChangesAsync(cancellationToken);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Arama geçmişi kaydedilemedi (simple search)");
		}

		return Ok(new SimpleSearchResponse(results.Select(r => new DecisionDto(r.Id, r.YargitayDairesi, r.EsasNo, r.KararNo, r.KararTarihi, r.KararMetni)).ToList(), results.Count));
	}


	private async Task<T> RunWithTimeout<T>(Func<CancellationToken, Task<T>> action, TimeSpan timeout, CancellationToken outerToken)
	{
		using var cts = CancellationTokenSource.CreateLinkedTokenSource(outerToken);
		cts.CancelAfter(timeout);
		try
		{
			return await action(cts.Token);
		}
		catch (OperationCanceledException) when (cts.IsCancellationRequested && !outerToken.IsCancellationRequested)
		{
			_logger.LogWarning("Inner operation timeout {TimeoutMs} ms", timeout.TotalMilliseconds);
			return default!;
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "RunWithTimeout exception (ignored)");
			return default!;
		}
	}

	private static string TrimForAi(string text, int maxChars)
	{
		if (string.IsNullOrEmpty(text)) return text;
		return text.Length <= maxChars ? text : text.Substring(0, maxChars);
	}

	private class RelevanceTemp
	{
		public int Score { get; set; }
		public string Explanation { get; set; } = string.Empty;
		public string Similarity { get; set; } = string.Empty;
	}

	private class KeywordWrapper { public List<string> Keywords { get; set; } = new(); }

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

	// GET api/search/admin/stats - Admin için arama istatistikleri
	[HttpGet("admin/stats")]
	[Authorize(Roles = "Admin,SuperAdmin")]
	[ProducesResponseType(typeof(SearchStatsDto), 200)]
	public async Task<IActionResult> GetSearchStats([FromQuery] int days = 30)
	{
		days = Math.Clamp(days, 1, 365);
		var startDate = DateTime.UtcNow.AddDays(-days);
		
		// Toplam arama sayısı
		var totalSearches = await _db.SearchHistories.CountAsync();
		var periodSearches = await _db.SearchHistories.CountAsync(h => h.CreatedAt >= startDate);
		
		// Günlük arama sayıları
		var dailySearches = await _db.SearchHistories
			.Where(h => h.CreatedAt >= startDate)
			.GroupBy(h => h.CreatedAt.Date)
			.Select(g => new DailySearchCount(g.Key, g.Count()))
			.OrderBy(x => x.Date)
			.ToListAsync();
		
		// En çok aranan anahtar kelimeler
		var allKeywords = await _db.SearchHistories
			.Where(h => h.CreatedAt >= startDate)
			.Select(h => h.Keywords)
			.ToListAsync();
		
		var keywordCounts = allKeywords
			.SelectMany(k => k.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
			.GroupBy(k => k.ToLower())
			.Select(g => new KeywordCount(g.Key, g.Count()))
			.OrderByDescending(x => x.Count)
			.Take(20)
			.ToList();
		
		// Benzersiz kullanıcı sayısı
		var uniqueUsers = await _db.SearchHistories
			.Where(h => h.CreatedAt >= startDate)
			.Select(h => h.UserId)
			.Distinct()
			.CountAsync();
		
		// Ortalama sonuç sayısı
		var avgResults = await _db.SearchHistories
			.Where(h => h.CreatedAt >= startDate)
			.AverageAsync(h => (double?)h.ResultCount) ?? 0;
		
		return Ok(new SearchStatsDto(
			totalSearches,
			periodSearches,
			uniqueUsers,
			Math.Round(avgResults, 1),
			dailySearches,
			keywordCounts
		));
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
public record SearchStatsDto(int TotalSearches, int PeriodSearches, int UniqueUsers, double AvgResults, List<DailySearchCount> DailySearches, List<KeywordCount> TopKeywords);
public record DailySearchCount(DateTime Date, int Count);
public record KeywordCount(string Keyword, int Count);


