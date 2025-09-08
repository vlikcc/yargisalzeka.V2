using System.Collections.Concurrent;
using SearchService.Models;

namespace SearchService.Services;

public class SearchProcessingStore
{
    private readonly ConcurrentDictionary<string, StoredSearchState> _states = new();

    public string CreatePending(string analysis, List<string> keywords)
    {
        var id = Guid.NewGuid().ToString("N");
        _states[id] = new StoredSearchState
        {
            SearchId = id,
            Status = SearchStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            Analysis = analysis,
            Keywords = keywords
        };
        return id;
    }

    public bool TryGet(string id, out StoredSearchState state) => _states.TryGetValue(id, out state!);

    public void Complete(string id, List<ScoredDecisionDto> decisions, string? error = null)
    {
        if (_states.TryGetValue(id, out var state))
        {
            state.Status = string.IsNullOrEmpty(error) ? SearchStatus.Completed : SearchStatus.Error;
            state.Decisions = decisions;
            state.Error = error;
            state.CompletedAt = DateTime.UtcNow;
        }
    }

    // Basit temizlik (isteğe bağlı çağrılabilir)
    public void CleanupOlderThan(TimeSpan maxAge)
    {
        var threshold = DateTime.UtcNow - maxAge;
        foreach (var kv in _states)
        {
            if (kv.Value.CreatedAt < threshold)
            {
                _states.TryRemove(kv.Key, out _);
            }
        }
    }

    public class StoredSearchState
    {
        public string SearchId { get; set; } = string.Empty;
        public SearchStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Analysis { get; set; } = string.Empty;
        public List<string> Keywords { get; set; } = new();
        public List<ScoredDecisionDto> Decisions { get; set; } = new();
        public string? Error { get; set; }
    }
}

public enum SearchStatus { Pending, Completed, Error }
