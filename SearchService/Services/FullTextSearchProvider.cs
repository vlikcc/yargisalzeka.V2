using Microsoft.EntityFrameworkCore;
using SearchService.DbContexts;
using SearchService.Models;
using Npgsql;

namespace SearchService.Services;

/// <summary>
/// PostgreSQL Full Text Search provider (Turkish dictionary) using generated tsvector column 'search_vector'.
/// Requires migration script to add column & GIN index.
/// </summary>
public class FullTextSearchProvider : ISearchProvider
{
    private readonly SearchDbContext _dbContext;
    private readonly ILogger<FullTextSearchProvider> _logger;
    public FullTextSearchProvider(SearchDbContext dbContext, ILogger<FullTextSearchProvider> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
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
        try
        {
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
        catch (PostgresException pex) when (pex.SqlState == "42703" || pex.SqlState == "42P01")
        {
            // 42703: column not found (search_vector yok); 42P01: table not found
            _logger.LogWarning(pex, "FullTextSearchProvider FTS sorgusu başarısız (fallback ILIKE) - SqlState={SqlState}", pex.SqlState);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "FullTextSearchProvider FTS genel hata (fallback ILIKE)");
        }

        // Fallback ILIKE
        try
        {
            IQueryable<SearchService.Entities.Decision> q = _dbContext.Decisions;
            foreach (var term in keywords.Where(k=>!string.IsNullOrWhiteSpace(k)))
            {
                var pattern = "%" + term.Trim().ToLower() + "%";
                q = q.Where(d =>
                    EF.Functions.ILike(d.YargitayDairesi, pattern) ||
                    EF.Functions.ILike(d.EsasNo, pattern) ||
                    EF.Functions.ILike(d.KararNo, pattern) ||
                    EF.Functions.ILike(d.KararMetni, pattern)
                );
            }
            return await q
                .OrderByDescending(d => d.KararTarihi)
                .Take(50)
                .Select(d => new DecisionDto(d.Id, d.YargitayDairesi, d.EsasNo, d.KararNo, d.KararTarihi, d.KararMetni))
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex2)
        {
            _logger.LogError(ex2, "FullTextSearchProvider fallback ILIKE da başarısız");
            return new List<DecisionDto>();
        }
    }
}
