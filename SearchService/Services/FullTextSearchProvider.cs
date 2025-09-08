using Microsoft.EntityFrameworkCore;
using SearchService.DbContexts;
using SearchService.Models;

namespace SearchService.Services;

/// <summary>
/// PostgreSQL Full Text Search provider (Turkish dictionary) using generated tsvector column 'search_vector'.
/// Requires migration script to add column & GIN index.
/// </summary>
public class FullTextSearchProvider : ISearchProvider
{
    private readonly SearchDbContext _dbContext;
    public FullTextSearchProvider(SearchDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<DecisionDto>> SearchAsync(List<string> keywords, CancellationToken cancellationToken = default)
    {
        // Join terms into a single plain language query; plainto_tsquery handles AND logic.
        var queryText = string.Join(' ', keywords.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()))
            .Trim();
        if (string.IsNullOrWhiteSpace(queryText)) return new List<DecisionDto>();

        // ORDER BY ts_rank_cd(...) first, then decision date desc as a secondary ordering.
        // NOTE: We don't select the rank column to keep entity mapping simple.
        // Use parameterization via FromSqlInterpolated to avoid injection.
        var results = await _dbContext.Decisions
            .FromSqlInterpolated($@"SELECT id, yargitay_dairesi, esas_no, karar_no, karar_tarihi, karar_metni
                                    FROM kararlar
                                    WHERE search_vector @@ plainto_tsquery('turkish', {queryText})
                                    ORDER BY ts_rank_cd(search_vector, plainto_tsquery('turkish', {queryText})) DESC, karar_tarihi DESC
                                    LIMIT 50")
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
