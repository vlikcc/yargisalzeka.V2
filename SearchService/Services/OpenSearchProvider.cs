using OpenSearch.Client;
using SearchService.Models;

namespace SearchService.Services;

public class OpenSearchProvider : ISearchProvider
{
	private readonly IOpenSearchClient _client;
	private readonly string _indexName;

	public OpenSearchProvider(IOpenSearchClient client, IConfiguration configuration)
	{
		_client = client;
		_indexName = configuration["OpenSearch:Index"] ?? "decisions";
	}

	public async Task<List<DecisionDto>> SearchAsync(List<string> keywords, CancellationToken cancellationToken = default)
	{
		var queryText = string.Join(" ", keywords);

		var response = await _client.SearchAsync<OpenSearchDecisionDocument>(s => s
			.Index(_indexName)
			.Size(50)
			.Query(q => q
				.Bool(b => b
					.Must(
						q.Exists(e => e.Field(f => f.KararTarihi)) // Tarih alanı var olan kayıtları getir
					)
					.Should(
						q.MultiMatch(mm => mm
							.Fields(f => f.Field("yargitayDairesi").Field("esasNo").Field("kararNo").Field("kararMetni"))
							.Query(queryText)
							.Type(TextQueryType.BestFields)
							.Fuzziness(Fuzziness.Auto)
							.PrefixLength(1)
						),
						q.SimpleQueryString(sqs => sqs
							.Fields(f => f.Field("yargitayDairesi^2").Field("esasNo").Field("kararNo").Field("kararMetni"))
							.Query(queryText)
							.DefaultOperator(Operator.And)
						)
					)
					.MinimumShouldMatch(1)
				)
			)
			.Sort(ss => ss.Descending(f => f.KararTarihi))
		, cancellationToken);

		if (!response.IsValid)
		{
			throw new InvalidOperationException($"OpenSearch arama hatası: {response.OriginalException?.Message ?? response.ServerError?.ToString()}");
		}

		var results = response.Hits
			.Select(h => new DecisionDto(
				h.Source.Id,
				h.Source.YargitayDairesi,
				h.Source.EsasNo,
				h.Source.KararNo,
				h.Source.KararTarihi,
				h.Source.KararMetni
			))
			.ToList();

		return results;
	}
}


