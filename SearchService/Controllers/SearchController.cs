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
	[ProducesResponseType(typeof(SearchResponse), 200)]
	public async Task<IActionResult> Search([FromBody] SearchRequest request, CancellationToken cancellationToken)
	{
		if (string.IsNullOrWhiteSpace(request.CaseText)) return BadRequest("Olay metni gerekli.");

		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();

		var sub = _factory.CreateClient("Subscription");
		var token = Request.Headers["Authorization"].ToString();
		if (!string.IsNullOrEmpty(token)) sub.DefaultRequestHeaders.Add("Authorization", token);
		var usage = await sub.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage");
		if (usage == null) return StatusCode(502, "Subscription service unreachable");
		if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

		var aiClient = _factory.CreateClient("AIService");
		if (!string.IsNullOrEmpty(token)) aiClient.DefaultRequestHeaders.Add("Authorization", token);

		var keywordTask = RunWithTimeout(async ct =>
		{
			var resp = await aiClient.PostAsJsonAsync("api/gemini/extract-keywords", new KeywordExtractionRequest(request.CaseText), ct);
			if (!resp.IsSuccessStatusCode)
			{
				_logger.LogWarning("Keyword extraction degraded (status {Status})", resp.StatusCode);
				return new List<string>();
			}
			return await resp.Content.ReadFromJsonAsync<List<string>>(cancellationToken: ct) ?? new List<string>();
		}, TimeSpan.FromSeconds(12), cancellationToken);

		var analysisTask = RunWithTimeout(async ct =>
		{
			var resp = await aiClient.PostAsJsonAsync("api/gemini/analyze-case", new { CaseText = request.CaseText }, ct);
			if (!resp.IsSuccessStatusCode)
			{
				_logger.LogWarning("Case analysis degraded (status {Status})", resp.StatusCode);
				return "Analiz şu anda gerçekleştirilemedi";
			}
			var dto = await resp.Content.ReadFromJsonAsync<CaseAnalysisResponse>(cancellationToken: ct);
			return dto?.AnalysisResult ?? string.Empty;
		}, TimeSpan.FromSeconds(14), cancellationToken);

		await Task.WhenAll(keywordTask, analysisTask);
		var keywords = (await keywordTask) ?? new List<string>();
		if (keywords.Count == 0)
		{
			keywords = request.CaseText
				.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
				.Where(w => w.Length > 3)
				.Take(5)
				.ToList();
		}
		var caseAnalysis = await analysisTask ?? string.Empty;

		if (keywords.Count == 0)
		{
			return Ok(new
			{
				decisions = new List<object>(),
				analysis = new { analysisResult = caseAnalysis },
				keywords = new { keywords = keywords },
				totalResults = 0
			});
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

	// Yeni asenkron iki aşamalı akış
	// 1) /api/search/init : Analiz + Keyword extraction, arka planda karar araması & skorlamayı tetikler
	[HttpPost("init")]
	[ProducesResponseType(typeof(InitSearchResponse), 200)]
	public async Task<IActionResult> Init([FromBody] InitSearchRequest request, CancellationToken cancellationToken)
	{
		if (string.IsNullOrWhiteSpace(request.CaseText)) return BadRequest("Olay metni gerekli.");
		var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
		if (string.IsNullOrEmpty(userId)) return Unauthorized();

		// Abonelik limiti kontrol (sadece Search limiti henüz tüketmeyeceğiz, kararlar hazır olduğunda tüketeceğiz)
		var subClient = _factory.CreateClient("Subscription");
		var token = Request.Headers["Authorization"].ToString();
		if (!string.IsNullOrEmpty(token)) subClient.DefaultRequestHeaders.Add("Authorization", token);
		var usage = await subClient.GetFromJsonAsync<UsageStatsDto>("api/subscription/usage", cancellationToken);
		if (usage == null) return StatusCode(502, "Subscription service unreachable");
		if (usage.SearchRemaining == 0) return Forbid("Limit tükendi");

		var aiClient = _factory.CreateClient("AIService");
		if (!string.IsNullOrEmpty(token)) aiClient.DefaultRequestHeaders.Add("Authorization", token);

		// Paralel analiz & keyword extraction
		var keywordTask = RunWithTimeout(async ct =>
		{
			var resp = await aiClient.PostAsJsonAsync("api/gemini/extract-keywords", new KeywordExtractionRequest(request.CaseText), ct);
			if (!resp.IsSuccessStatusCode) return new List<string>();
			return await resp.Content.ReadFromJsonAsync<List<string>>(cancellationToken: ct) ?? new List<string>();
		}, TimeSpan.FromSeconds(12), cancellationToken);

		var analysisTask = RunWithTimeout(async ct =>
		{
			var resp = await aiClient.PostAsJsonAsync("api/gemini/analyze-case", new { CaseText = request.CaseText }, ct);
			if (!resp.IsSuccessStatusCode) return "Analiz gerçekleştirilemedi";
			var dto = await resp.Content.ReadFromJsonAsync<CaseAnalysisResponse>(cancellationToken: ct);
			return dto?.AnalysisResult ?? string.Empty;
		}, TimeSpan.FromSeconds(14), cancellationToken);

		await Task.WhenAll(keywordTask, analysisTask);
		var keywords = (await keywordTask) ?? new List<string>();
		if (keywords.Count == 0)
		{
			keywords = request.CaseText
				.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
				.Where(w => w.Length > 3)
				.Take(5)
				.ToList();
		}
		var analysis = await analysisTask ?? string.Empty;

		var searchId = _store.CreatePending(analysis, keywords);

		// Arka plan işini başlat
		_ = Task.Run(async () => await ProcessSearchAsync(searchId, request.CaseText, keywords, userId!, token), CancellationToken.None);

		return Ok(new InitSearchResponse(searchId,
			new CaseAnalysisResponse(analysis),
			new KeywordExtractionResult(keywords)));
	}

	// 2) /api/search/result/{searchId}
	[HttpGet("result/{searchId}")]
	[ProducesResponseType(typeof(SearchResultResponse), 200)]
	public IActionResult GetResult(string searchId)
	{
		if (!_store.TryGet(searchId, out var state)) return NotFound();
		return Ok(new SearchResultResponse(
			state.SearchId,
			state.Status.ToString().ToLower(),
			new CaseAnalysisResponse(state.Analysis),
			new KeywordExtractionResult(state.Keywords),
			state.Decisions,
			state.Error
		));
	}

	private async Task ProcessSearchAsync(string searchId, string caseText, List<string> keywords, string userId, string token)
	{
		try
		{
			var results = await _searchProvider.SearchAsync(keywords);

			// Relevance scoring (tüm sonuçlar için veya sınırlı)
			var maxScoreCount = int.TryParse(Environment.GetEnvironmentVariable("SEARCH_RELEVANCE_MAX"), out var tmp) ? Math.Clamp(tmp, 1, 50) : 15;
			var toScore = results.Take(maxScoreCount).ToList();
			var scores = new ConcurrentDictionary<long, (int score, string explanation, string similarity)>();
			try
			{
				var aiClientForRelevance = _factory.CreateClient("AIService");
				if (!string.IsNullOrEmpty(token)) aiClientForRelevance.DefaultRequestHeaders.Add("Authorization", token);
				var semaphore = new SemaphoreSlim(4);
				var tasks = toScore.Select(async d =>
				{
					await semaphore.WaitAsync();
					try
					{
						using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
						var body = new { CaseText = caseText, DecisionText = TrimForAi(d.KararMetni, 6000) };
						var resp = await aiClientForRelevance.PostAsJsonAsync("api/gemini/analyze-relevance", body, cts.Token);
						if (!resp.IsSuccessStatusCode) return;
						var relevance = await resp.Content.ReadFromJsonAsync<RelevanceTemp>(cancellationToken: cts.Token);
						if (relevance != null)
						{
							scores[d.Id] = (relevance.Score, relevance.Explanation, relevance.Similarity);
						}
					}
					catch { }
					finally { semaphore.Release(); }
				});
				await Task.WhenAll(tasks);
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Relevance skorlaması başarısız (async)");
			}

			var top = results
				.Select(r => new
				{
					r,
					sc = scores.TryGetValue(r.Id, out var scVal) ? scVal.score : (int?)null,
					ex = scores.TryGetValue(r.Id, out var scVal2) ? scVal2.explanation : null,
					sim = scores.TryGetValue(r.Id, out var scVal3) ? scVal3.similarity : null
				})
				.OrderByDescending(x => x.sc ?? int.MinValue)
				.ThenByDescending(x => x.r.KararTarihi)
				.Take(3)
				.Select(x => new ScoredDecisionDto(
					x.r.Id,
					x.r.YargitayDairesi,
					x.r.EsasNo,
					x.r.KararNo,
					x.r.KararTarihi,
					x.r.KararMetni,
					x.sc,
					x.ex,
					x.sim
				))
				.ToList();

			// Kullanım tüket
			try
			{
				var subClient = _factory.CreateClient("Subscription");
				if (!string.IsNullOrEmpty(token)) subClient.DefaultRequestHeaders.Add("Authorization", token);
				await subClient.PostAsJsonAsync("api/subscription/consume", new { FeatureType = "Search" });
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Subscription consume başarısız (async)");
			}

			// Geçmiş kaydı
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
				await _db.SaveChangesAsync();
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Arama geçmişi kaydedilemedi (async)");
			}

			_store.Complete(searchId, top);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Async arama süreci hata");
			_store.Complete(searchId, new List<ScoredDecisionDto>(), "Arama sırasında hata");
		}
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


