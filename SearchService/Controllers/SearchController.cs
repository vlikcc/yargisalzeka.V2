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
		if (string.IsNullOrWhiteSpace(request.CaseText) && (request.Keywords == null || request.Keywords.Count == 0))
		{
			return BadRequest("Olay metni veya en az bir anahtar kelime gerekli.");
		}

		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();

		var sub = _factory.CreateClient("Subscription");
		var token = Request.Headers["Authorization"].ToString();
		if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
		var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage");
		if (usage == null) return StatusCode(502, "Subscription service unreachable");
		if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

		List<string> keywords = request.Keywords?.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList() ?? new();
		string caseAnalysis = string.Empty;

		var aiNeeded = !request.SkipAnalysis || keywords.Count == 0; // Eğer frontend her şeyi yaptıysa AI çağrılarını atla
		if (aiNeeded)
		{
			var aiClient = _factory.CreateClient("AIService");
			if (!string.IsNullOrEmpty(token)) aiClient.DefaultRequestHeaders.Add("Authorization", token);

			// İki isteği paralel (gerektiği ölçüde) ve per-call timeout ile çalıştır
			var keywordTask = keywords.Count == 0 ? RunWithTimeout(async ct =>
			{
				var keywordRequest = new KeywordExtractionRequest(request.CaseText);
				var resp = await aiClient.PostAsJsonAsync("api/gemini/extract-keywords", keywordRequest, ct);
				if (!resp.IsSuccessStatusCode)
				{
					_logger.LogWarning("Keyword extraction degraded (status {Status})", resp.StatusCode);
					return new List<string>();
				}
				return await resp.Content.ReadFromJsonAsync<List<string>>(cancellationToken: ct) ?? new List<string>();
			}, TimeSpan.FromSeconds(12), cancellationToken) : Task.FromResult(keywords);

			var analysisTask = !request.SkipAnalysis ? RunWithTimeout(async ct =>
			{
				var analysisRequest = new { CaseText = request.CaseText };
				var resp = await aiClient.PostAsJsonAsync("api/gemini/analyze-case", analysisRequest, ct);
				if (!resp.IsSuccessStatusCode)
				{
					_logger.LogWarning("Case analysis degraded (status {Status})", resp.StatusCode);
					return "Analiz şu anda gerçekleştirilemedi";
				}
				var dto = await resp.Content.ReadFromJsonAsync<CaseAnalysisResponse>(cancellationToken: ct);
				return dto?.AnalysisResult ?? string.Empty;
			}, TimeSpan.FromSeconds(14), cancellationToken) : Task.FromResult(string.Empty);

			await Task.WhenAll(keywordTask, analysisTask);
			if (keywords.Count == 0) keywords = (await keywordTask) ?? new List<string>();
			if (string.IsNullOrEmpty(caseAnalysis)) caseAnalysis = await analysisTask;
		}

		// Arama (keywords boşsa sınırlı fallback: metindeki ilk 5 kelimeyi al)
		if (keywords.Count == 0 && !string.IsNullOrWhiteSpace(request.CaseText))
		{
			keywords = request.CaseText
				.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
				.Where(w => w.Length > 3)
				.Take(5)
				.ToList();
		}
		var results = await _searchProvider.SearchAsync(keywords, cancellationToken);

		// Relevance skorlaması: AIService AnalyzeRelevance çağrısı (performans için sınırlı sayıda)
		var maxScoreCount = int.TryParse(Environment.GetEnvironmentVariable("SEARCH_RELEVANCE_MAX") , out var tmp) ? Math.Clamp(tmp, 1, 50) : 15;
		var toScore = results.Take(maxScoreCount).ToList();
		var scores = new Dictionary<long, (int score, string explanation, string similarity)>();
		try
		{
			var aiClientForRelevance = _factory.CreateClient("AIService");
			var token2 = Request.Headers["Authorization"].ToString();
			if (!string.IsNullOrEmpty(token2)) aiClientForRelevance.DefaultRequestHeaders.Add("Authorization", token2);
			var semaphore = new SemaphoreSlim(4); // eş zamanlı istek limiti
			var tasks = toScore.Select(async d =>
			{
				await semaphore.WaitAsync(cancellationToken);
				try
				{
					using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
					cts.CancelAfter(TimeSpan.FromSeconds(10));
					var body = new { CaseText = request.CaseText, DecisionText = TrimForAi(d.KararMetni, 6000) };
					var resp = await aiClientForRelevance.PostAsJsonAsync("api/gemini/analyze-relevance", body, cts.Token);
					if (!resp.IsSuccessStatusCode) return; // sessizce geç
					var relevance = await resp.Content.ReadFromJsonAsync<RelevanceTemp>(cancellationToken: cts.Token);
					if (relevance != null)
					{
						lock (scores) { scores[d.Id] = (relevance.Score, relevance.Explanation, relevance.Similarity); }
					}
				}
				catch (Exception ex)
				{
					_logger.LogDebug(ex, "Relevance scoring hata (decision {DecisionId})", d.Id);
				}
				finally { semaphore.Release(); }
			});
			await Task.WhenAll(tasks);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Relevance toplu skorlaması başarısız - skorlar olmadan devam");
		}
		await sub.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Search" });

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

		return Ok(new
		{
			decisions = results.Select(r => new {
				id = r.Id,
				yargitayDairesi = r.YargitayDairesi,
				esasNo = r.EsasNo,
				kararNo = r.KararNo,
				kararTarihi = r.KararTarihi,
				kararMetni = r.KararMetni,
				score = scores.TryGetValue(r.Id, out var sc) ? sc.score : (int?)null,
				relevanceExplanation = scores.TryGetValue(r.Id, out var sc2) ? sc2.explanation : null,
				relevanceSimilarity = scores.TryGetValue(r.Id, out var sc3) ? sc3.similarity : null
			}).ToList(),
			analysis = new { analysisResult = caseAnalysis },
			keywords = new { keywords = keywords },
			totalResults = results.Count
		});
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


