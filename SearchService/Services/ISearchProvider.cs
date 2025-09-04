using SearchService.Models;

namespace SearchService.Services;

public interface ISearchProvider
{
	Task<List<DecisionDto>> SearchAsync(List<string> keywords, CancellationToken cancellationToken = default);
}


