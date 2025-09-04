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

		IQueryable<Entities.Decision> query = _dbContext.Decisions
			.Where(d => d.KararTarihi != null); // NULL tarihleri filtrele

		foreach (var k in keywordsLower)
		{
			var pattern = "%" + k + "%";
			query = query.Where(d =>
				EF.Functions.ILike(d.YargitayDairesi, pattern) ||
				EF.Functions.ILike(d.EsasNo, pattern) ||
				EF.Functions.ILike(d.KararNo, pattern) ||
				EF.Functions.ILike(d.KararMetni, pattern)
			);
		}

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


