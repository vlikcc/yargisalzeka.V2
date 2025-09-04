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

	public AdminController(IConfiguration configuration, SearchDbContext dbContext, IOpenSearchClient client, ILogger<AdminController> logger)
	{
		_configuration = configuration;
		_dbContext = dbContext;
		_client = client;
		_logger = logger;
	}

	[HttpPost("reindex")]
	public async Task<IActionResult> Reindex(CancellationToken cancellationToken)
	{
		var provider = _configuration["Search:Provider"] ?? "postgres";
		if (!provider.Equals("opensearch", StringComparison.OrdinalIgnoreCase))
		{
			return BadRequest("Reindex işlemi sadece OpenSearch sağlayıcısı aktifken çalıştırılabilir (Search:Provider=opensearch).");
		}

		var indexName = _configuration["OpenSearch:Index"] ?? "decisions";

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
				return StatusCode(500, $"Indeks oluşturulamadı: {createResponse.ServerError}");
			}
		}

		var all = await _dbContext.Decisions.AsNoTracking().ToListAsync(cancellationToken);
		if (all.Count == 0) return Ok(new { Indexed = 0 });

		var docs = all.Select(d => new OpenSearchDecisionDocument
		{
			Id = d.Id,
			YargitayDairesi = d.YargitayDairesi,
			EsasNo = d.EsasNo,
			KararNo = d.KararNo,
			KararTarihi = d.KararTarihi,
			KararMetni = d.KararMetni
		}).ToList();

		var bulkResponse = await _client.IndexManyAsync(docs, indexName, cancellationToken);
		if (!bulkResponse.IsValid)
		{
			return StatusCode(500, $"Toplu indeksleme hatası: {bulkResponse.ServerError}");
		}

		return Ok(new { Indexed = all.Count });
	}
}


