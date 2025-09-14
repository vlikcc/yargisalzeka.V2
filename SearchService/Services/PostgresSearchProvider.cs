using Microsoft.EntityFrameworkCore;
using SearchService.DbContexts;
using SearchService.Models;

namespace SearchService.Services;

public class PostgresSearchProvider : ISearchProvider
{
	private readonly SearchDbContext _dbContext;
	public PostgresSearchProvider(SearchDbContext dbContext)
	{
		_dbContext = dbContext;
	}

	public async Task<List<DecisionDto>> SearchAsync(List<string> keywords, CancellationToken cancellationToken = default)
	{
		var keywordsLower = keywords
			.Select(k => k.Trim())
			.Where(k => !string.IsNullOrWhiteSpace(k))
			.Select(k => k.ToLower())
			.ToList();

		var queryText = string.Join(" & ", keywordsLower); // Anahtar kelimeleri AND ile birleştir

		var results = await _dbContext.Decisions
			.FromSqlInterpolated($@"
				SELECT * FROM kararlar
				WHERE karar_tarihi IS NOT NULL
				AND search_vector @@ plainto_tsquery('turkish', {queryText})
				ORDER BY karar_tarihi DESC
				LIMIT 50
			")
			.Select(d => new DecisionDto(
				d.Id,
				d.YargitayDairesi,
				d.EsasNo,
				d.KararNo,
				d.KararTarihi,
				d.KararMetni
			))
			.ToListAsync(cancellationToken);

		return results;
	}
}


