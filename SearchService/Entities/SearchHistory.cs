namespace SearchService.Entities;

public class SearchHistory
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty; // comma-separated
    public int ResultCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
