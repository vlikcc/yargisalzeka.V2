namespace SearchService.Entities;

public class SavedDecision
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public long DecisionId { get; set; }
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;

    public Decision? Decision { get; set; }
}
