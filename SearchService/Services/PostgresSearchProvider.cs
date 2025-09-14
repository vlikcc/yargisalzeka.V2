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

		IQueryable<Entities.Decision> query = _dbContext.Decisions
			.Where(d => d.KararTarihi != null &&
				EF.Functions.ToTsVector("turkish", d.SearchVector)
					.Matches(EF.Functions.PlainToTsQuery("turkish", queryText))
			);

		var results = await query
			.OrderByDescending(d => d.KararTarihi)
			.Take(50)
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


