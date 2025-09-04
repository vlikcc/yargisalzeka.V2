using AIService.Models;

namespace AIService.Services;

public interface IGeminiAiService
{
    Task<List<string>> ExtractKeywordsFromCaseAsync(string caseText);
    Task<RelevanceResponse> AnalyzeDecisionRelevanceAsync(string caseText, string decisionText);
    Task<string> GeneratePetitionTemplateAsync(string caseText, List<RelevantDecisionDto> relevantDecisions);
    Task<CaseAnalysisResponse> AnalyzeCaseTextAsync(string caseText);
}
