using Nest;
using SearchService.Models;

namespace SearchService.Services;

/// <summary>
/// Elasticsearch provider - sadece kararMetni alanında arama yapar.
/// Türkçe analyzer ve fuzzy matching destekler.
/// </summary>
public class ElasticsearchProvider : ISearchProvider
{
    private readonly IElasticClient _client;
    private readonly string _indexName;
    private readonly ILogger<ElasticsearchProvider> _logger;

    public ElasticsearchProvider(
        IElasticClient client, 
        IConfiguration configuration,
        ILogger<ElasticsearchProvider> logger)
    {
        _client = client;
        _indexName = configuration["Elasticsearch:Index"] ?? "kararlar";
        _logger = logger;
    }

    public async Task<List<DecisionDto>> SearchAsync(List<string> keywords, CancellationToken cancellationToken = default)
    {
        // Anahtar kelimeleri birleştir
        var queryText = string.Join(" ", keywords.Where(k => !string.IsNullOrWhiteSpace(k)).Select(k => k.Trim()));
        
        if (string.IsNullOrWhiteSpace(queryText))
        {
            _logger.LogWarning("Elasticsearch: Boş arama sorgusu");
            return new List<DecisionDto>();
        }

        _logger.LogInformation("Elasticsearch arama başlatıldı. Query: {Query}, Index: {Index}", queryText, _indexName);

        try
        {
            var response = await _client.SearchAsync<ElasticsearchDecisionDocument>(s => s
                .Index(_indexName)
                .Size(50)
                .Query(q => q
                    .Bool(b => b
                        .Should(
                            // 1. Tam metin eşleşme (yüksek skor)
                            sh => sh.Match(m => m
                                .Field(f => f.KararMetni)
                                .Query(queryText)
                                .Operator(Operator.Or)
                                .Boost(2.0)
                            ),
                            // 2. Fuzzy arama (yazım hatalarını tolere eder)
                            sh => sh.Match(m => m
                                .Field(f => f.KararMetni)
                                .Query(queryText)
                                .Fuzziness(Fuzziness.Auto)
                                .PrefixLength(2)
                                .Boost(1.0)
                            ),
                            // 3. Phrase match (kelime grupları için)
                            sh => sh.MatchPhrase(mp => mp
                                .Field(f => f.KararMetni)
                                .Query(queryText)
                                .Slop(2)
                                .Boost(3.0)
                            ),
                            // 4. Wildcard (kısmi eşleşmeler)
                            sh => sh.Wildcard(w => w
                                .Field(f => f.KararMetni)
                                .Value($"*{queryText.ToLowerInvariant()}*")
                                .Boost(0.5)
                            )
                        )
                        .MinimumShouldMatch(1)
                    )
                )
                .Sort(ss => ss
                    .Descending(SortSpecialField.Score) // Önce relevance skoru
                    .Descending(f => f.KararTarihi)      // Sonra tarih
                )
                .Highlight(h => h
                    .PreTags("<mark>")
                    .PostTags("</mark>")
                    .Fields(
                        f => f.Field(p => p.KararMetni)
                            .FragmentSize(200)
                            .NumberOfFragments(3)
                    )
                )
            , cancellationToken);

            if (!response.IsValid)
            {
                _logger.LogError("Elasticsearch arama hatası: {Error}", 
                    response.OriginalException?.Message ?? response.ServerError?.ToString());
                
                // Fallback: Basit query string ile dene
                return await SearchWithQueryStringAsync(queryText, cancellationToken);
            }

            _logger.LogInformation("Elasticsearch arama tamamlandı. Bulunan: {Count} sonuç", response.Documents.Count);

            var results = response.Hits.Select(h => new DecisionDto(
                h.Source.Id,
                h.Source.YargitayDairesi,
                h.Source.EsasNo,
                h.Source.KararNo,
                h.Source.KararTarihi,
                // Highlight varsa onu kullan, yoksa orijinal metin
                h.Highlight?.ContainsKey("kararMetni") == true 
                    ? string.Join("... ", h.Highlight["kararMetni"]) 
                    : h.Source.KararMetni
            )).ToList();

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Elasticsearch arama exception");
            return await SearchWithQueryStringAsync(queryText, cancellationToken);
        }
    }

    /// <summary>
    /// Fallback arama metodu - basit query string kullanır
    /// </summary>
    private async Task<List<DecisionDto>> SearchWithQueryStringAsync(string queryText, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Elasticsearch fallback query string araması");

            var response = await _client.SearchAsync<ElasticsearchDecisionDocument>(s => s
                .Index(_indexName)
                .Size(50)
                .Query(q => q
                    .QueryString(qs => qs
                        .Query($"kararMetni:({queryText})")
                        .DefaultOperator(Operator.Or)
                        .AllowLeadingWildcard(false)
                    )
                )
                .Sort(ss => ss.Descending(f => f.KararTarihi))
            , cancellationToken);

            if (!response.IsValid)
            {
                _logger.LogWarning("Elasticsearch fallback da başarısız: {Error}", 
                    response.ServerError?.ToString());
                return new List<DecisionDto>();
            }

            return response.Documents.Select(d => new DecisionDto(
                d.Id,
                d.YargitayDairesi,
                d.EsasNo,
                d.KararNo,
                d.KararTarihi,
                d.KararMetni
            )).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Elasticsearch fallback arama hatası");
            return new List<DecisionDto>();
        }
    }
}

/// <summary>
/// Elasticsearch index document modeli
/// </summary>
public class ElasticsearchDecisionDocument
{
    public long Id { get; set; }
    public string YargitayDairesi { get; set; } = string.Empty;
    public string EsasNo { get; set; } = string.Empty;
    public string KararNo { get; set; } = string.Empty;
    public DateTime? KararTarihi { get; set; }
    public string KararMetni { get; set; } = string.Empty;
}

