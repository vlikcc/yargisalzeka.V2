namespace AIService;

/// <summary>
/// Centralized feature type names used for subscription validation & consumption.
/// Avoids magic strings scattered across controllers.
/// </summary>
public static class FeatureTypes
{
    public const string CaseAnalysis = "CaseAnalysis";
    public const string KeywordExtraction = "KeywordExtraction";
    public const string Search = "Search";
    public const string Petition = "Petition";
}
