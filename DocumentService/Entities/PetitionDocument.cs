namespace DocumentService.Entities;

public class PetitionDocument
{
    public long Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string CaseText { get; set; } = string.Empty;
    public string? DecisionsJson { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
