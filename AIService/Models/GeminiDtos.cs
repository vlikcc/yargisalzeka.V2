using System.ComponentModel.DataAnnotations;

namespace AIService.Models;

public class KeywordRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
}

public class RelevanceRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    [Required]
    public string DecisionText { get; set; } = string.Empty;
}

public class RelevanceResponse
{
    public int Score { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public string Similarity { get; set; } = string.Empty;
}

public class RelevantDecisionDto
{
    public string? Title { get; set; }
    public string? Summary { get; set; }
}

public class PetitionRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    [Required]
    public List<RelevantDecisionDto> RelevantDecisions { get; set; } = new();
}

public class SearchDecisionsRequest
{
    [Required]
    public List<string> Keywords { get; set; } = new();
}

public class DecisionSearchResult
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public DateTime? DecisionDate { get; set; } // Nullable yap
    public string Court { get; set; } = string.Empty;
}

public class CaseAnalysisRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    

}

public class CaseAnalysisResponse
{
     public string AnalysisResult { get; set; } = string.Empty;
}

public class TestTokenRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    [Required]
    public string Email { get; set; } = string.Empty;
}
