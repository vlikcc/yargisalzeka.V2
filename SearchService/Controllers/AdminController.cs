using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenSearch.Client;
using SearchService.DbContexts;
using SearchService.Entities;
using SearchService.Models;

namespace SearchService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
	private readonly IConfiguration _configuration;
	private readonly SearchDbContext _dbContext;
	private readonly IOpenSearchClient _client;
	private readonly ILogger<AdminController> _logger;

	private static readonly Dictionary<string, ReindexProgress> _reindexProgress = new();

	public AdminController(IConfiguration configuration, SearchDbContext dbContext, IOpenSearchClient client, ILogger<AdminController> logger)
	{
		_configuration = configuration;
		_dbContext = dbContext;
		_client = client;
		_logger = logger;
	}

	[HttpGet("reindex/status/{jobId}")]
	public IActionResult GetReindexStatus(string jobId)
	{
		if (_reindexProgress.TryGetValue(jobId, out var progress))
		{
			return Ok(progress);
		}
		return NotFound($"Reindex job '{jobId}' bulunamadı");
	}

	[HttpPost("reindex/background")]
	public IActionResult StartBackgroundReindex([FromQuery] int batchSize = 1000)
	{
		var jobId = Guid.NewGuid().ToString("N")[..8];
		var progress = new ReindexProgress
		{
			JobId = jobId,
			Status = "başlatılıyor",
			StartTime = DateTime.UtcNow,
			BatchSize = batchSize
		};
		
		_reindexProgress[jobId] = progress;
		
		// Background task başlat
		_ = Task.Run(async () => await BackgroundReindexAsync(jobId, batchSize));
		
		return Ok(new { JobId = jobId, Message = "Background reindex başlatıldı", StatusUrl = $"/api/admin/reindex/status/{jobId}" });
	}

	private async Task BackgroundReindexAsync(string jobId, int batchSize)
	{
		var progress = _reindexProgress[jobId];
		try
		{
			using var scope = ServiceProvider.CreateScope();
			var dbContext = scope.ServiceProvider.GetRequiredService<SearchDbContext>();
			var client = scope.ServiceProvider.GetRequiredService<IOpenSearchClient>();
			
			await PerformReindexAsync(jobId, batchSize, progress, dbContext, client);
		}
		catch (Exception ex)
		{
			progress.Status = "hata";
			progress.Error = ex.Message;
			progress.EndTime = DateTime.UtcNow;
			_logger.LogError(ex, "Background reindex job {JobId} başarısız", jobId);
		}
	}

	private IServiceProvider ServiceProvider => HttpContext.RequestServices;

	[HttpPost("reindex")]
	public async Task<IActionResult> Reindex([FromQuery] int batchSize = 1000, CancellationToken cancellationToken = default)
	{
		var provider = _configuration["Search:Provider"] ?? "postgres";
		if (!provider.Equals("opensearch", StringComparison.OrdinalIgnoreCase))
		{
			return BadRequest("Reindex işlemi sadece OpenSearch sağlayıcısı aktifken çalıştırılabilir (Search:Provider=opensearch).");
		}

		var indexName = _configuration["OpenSearch:Index"] ?? "decisions";

		// İndeks oluştur veya kontrol et
		var exists = await _client.Indices.ExistsAsync(indexName, ct: cancellationToken);
		if (!exists.Exists)
		{
			var createResponse = await _client.Indices.CreateAsync(indexName, c => c
				.Settings(s => s
					.Analysis(a => a
						.Analyzers(an => an
							.Custom("tr_analyzer", ca => ca
								.Tokenizer("standard")
								.Filters("lowercase", "asciifolding")
							)
						)
					)
					.NumberOfShards(3)
					.NumberOfReplicas(0) // Indexing sırasında replica'ları kapat
					.RefreshInterval("30s") // Indexing sırasında refresh'i yavaşlat
				)
				.Map<OpenSearchDecisionDocument>(m => m
					.AutoMap()
					.Properties(ps => ps
						.Text(t => t.Name(n => n.YargitayDairesi).Analyzer("tr_analyzer"))
						.Text(t => t.Name(n => n.EsasNo).Analyzer("tr_analyzer"))
						.Text(t => t.Name(n => n.KararNo).Analyzer("tr_analyzer"))
						.Text(t => t.Name(n => n.KararMetni).Analyzer("tr_analyzer"))
					)
				)
			, cancellationToken);

			if (!createResponse.IsValid)
			{
				return StatusCode(500, $"İndeks oluşturulamadı: {createResponse.ServerError}");
			}
			_logger.LogInformation("OpenSearch indeks '{IndexName}' oluşturuldu", indexName);
		}

		// Toplam kayıt sayısını öğren
		var totalCount = await _dbContext.Decisions.CountAsync(cancellationToken);
		if (totalCount == 0) return Ok(new { Indexed = 0, TotalRecords = 0 });

		_logger.LogInformation("Batch reindexing başlatıldı. Toplam kayıt: {TotalCount}, Batch boyutu: {BatchSize}", 
			totalCount, batchSize);

		var indexed = 0;
		var offset = 0;
		var batchNumber = 1;

		while (offset < totalCount)
		{
			try
			{
				_logger.LogInformation("Batch {BatchNumber} işleniyor... ({Offset}-{End}/{TotalCount})", 
					batchNumber, offset, Math.Min(offset + batchSize, totalCount), totalCount);

				// Batch'i veritabanından çek
				var batch = await _dbContext.Decisions
					.AsNoTracking()
					.OrderBy(d => d.Id)
					.Skip(offset)
					.Take(batchSize)
					.ToListAsync(cancellationToken);

				if (!batch.Any()) break;

				// OpenSearch dökümanlarına çevir
				var docs = batch.Select(d => new OpenSearchDecisionDocument
				{
					Id = d.Id,
					YargitayDairesi = d.YargitayDairesi,
					EsasNo = d.EsasNo,
					KararNo = d.KararNo,
					KararTarihi = d.KararTarihi,
					KararMetni = d.KararMetni
				}).ToList();

				// Bulk indexing
				var bulkResponse = await _client.IndexManyAsync(docs, indexName, cancellationToken);
				if (!bulkResponse.IsValid)
				{
					_logger.LogError("Batch {BatchNumber} indekslenemedi: {Error}", 
						batchNumber, bulkResponse.ServerError?.ToString());
					return StatusCode(500, $"Batch {batchNumber} indeksleme hatası: {bulkResponse.ServerError}");
				}

				indexed += batch.Count;
				offset += batchSize;
				batchNumber++;

				_logger.LogInformation("Batch {BatchNumber} tamamlandı. Toplam indekslenen: {Indexed}/{TotalCount} (%{Percentage:F1})", 
					batchNumber - 1, indexed, totalCount, (double)indexed / totalCount * 100);

				// Memory pressure'ı azaltmak için GC
				if (batchNumber % 10 == 0)
				{
					GC.Collect();
					GC.WaitForPendingFinalizers();
				}

				// Rate limiting - OpenSearch'ü boğmamak için
				await Task.Delay(100, cancellationToken);
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Batch {BatchNumber} işlenirken hata oluştu", batchNumber);
				throw;
			}
		}

		// İndeksleme tamamlandıktan sonra ayarları optimize et
		try
		{
			await _client.Indices.PutSettingsAsync(indexName, s => s
				.IndexSettings(settings => settings
					.NumberOfReplicas(1) // Replica'ları tekrar aç
					.RefreshInterval("1s") // Normal refresh interval
				), ct: cancellationToken);
			
			// Force refresh
			await _client.Indices.RefreshAsync(indexName, ct: cancellationToken);
			
			_logger.LogInformation("İndeks ayarları optimize edildi ve refresh yapıldı");
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "İndeks optimizasyonu sırasında uyarı");
		}

		_logger.LogInformation("Reindexing tamamlandı! Toplam indekslenen: {Indexed} kayıt", indexed);
		return Ok(new { 
			Indexed = indexed, 
			TotalRecords = totalCount,
			BatchSize = batchSize,
			Batches = batchNumber - 1,
			IndexName = indexName
		});
	}

	private async Task PerformReindexAsync(string jobId, int batchSize, ReindexProgress progress, SearchDbContext dbContext, IOpenSearchClient client)
	{
		var indexName = _configuration["OpenSearch:Index"] ?? "decisions";
		progress.Status = "çalışıyor";
		progress.IndexName = indexName;

		// Toplam kayıt sayısını öğren
		var totalCount = await dbContext.Decisions.CountAsync();
		progress.TotalRecords = totalCount;

		if (totalCount == 0)
		{
			progress.Status = "tamamlandı";
			progress.EndTime = DateTime.UtcNow;
			return;
		}

		var indexed = 0;
		var offset = 0;
		var batchNumber = 1;

		while (offset < totalCount)
		{
			// Batch'i veritabanından çek
			var batch = await dbContext.Decisions
				.AsNoTracking()
				.OrderBy(d => d.Id)
				.Skip(offset)
				.Take(batchSize)
				.ToListAsync();

			if (!batch.Any()) break;

			// OpenSearch dökümanlarına çevir
			var docs = batch.Select(d => new OpenSearchDecisionDocument
			{
				Id = d.Id,
				YargitayDairesi = d.YargitayDairesi,
				EsasNo = d.EsasNo,
				KararNo = d.KararNo,
				KararTarihi = d.KararTarihi,
				KararMetni = d.KararMetni
			}).ToList();

			// Bulk indexing
			var bulkResponse = await client.IndexManyAsync(docs, indexName);
			if (!bulkResponse.IsValid)
			{
				throw new Exception($"Batch {batchNumber} indeksleme hatası: {bulkResponse.ServerError}");
			}

			indexed += batch.Count;
			offset += batchSize;
			batchNumber++;

			// Progress güncelle
			progress.ProcessedRecords = indexed;
			progress.CurrentBatch = batchNumber - 1;
			progress.PercentageComplete = (double)indexed / totalCount * 100;
			progress.LastUpdated = DateTime.UtcNow;

			// Rate limiting
			await Task.Delay(50);
		}

		progress.Status = "tamamlandı";
		progress.EndTime = DateTime.UtcNow;
		progress.ProcessedRecords = indexed;
	}
}

public class ReindexProgress
{
	public string JobId { get; set; } = string.Empty;
	public string Status { get; set; } = string.Empty;
	public DateTime StartTime { get; set; }
	public DateTime? EndTime { get; set; }
	public DateTime LastUpdated { get; set; }
	public int TotalRecords { get; set; }
	public int ProcessedRecords { get; set; }
	public int CurrentBatch { get; set; }
	public int BatchSize { get; set; }
	public double PercentageComplete { get; set; }
	public string IndexName { get; set; } = string.Empty;
	public string? Error { get; set; }
	public TimeSpan? Duration => EndTime?.Subtract(StartTime);
}


