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
		var terms = keywords
			.Where(k => !string.IsNullOrWhiteSpace(k))
			.Select(k => k.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();
		if (terms.Count == 0) return new List<DecisionDto>();

		IQueryable<Entities.Decision> combined = _dbContext.Decisions.Where(d => false);
		foreach (var term in terms)
		{
			var pattern = "%" + term.ToLower() + "%";
			var termQuery = _dbContext.Decisions.Where(d =>
				EF.Functions.ILike(d.YargitayDairesi, pattern) ||
				EF.Functions.ILike(d.EsasNo, pattern) ||
				EF.Functions.ILike(d.KararNo, pattern) ||
				EF.Functions.ILike(d.KararMetni, pattern)
			);
			combined = combined.Concat(termQuery);
		}

		return await combined
			.GroupBy(d => d.Id)
			.Select(g => g.First())
			.OrderByDescending(d => d.KararTarihi)
			.Take(50)
			.Select(d => new DecisionDto(d.Id, d.YargitayDairesi, d.EsasNo, d.KararNo, d.KararTarihi, d.KararMetni))
            .ToListAsync(cancellationToken);
	}
}


