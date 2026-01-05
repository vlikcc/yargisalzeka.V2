using AIService.Models;

namespace AIService.Services;

public interface IGeminiAiService
{
    Task<List<string>> ExtractKeywordsFromCaseAsync(string caseText, string? fileUri = null, string? fileMimeType = null);
    Task<RelevanceResponse> AnalyzeDecisionRelevanceAsync(string caseText, string decisionText);
    Task<string> GeneratePetitionTemplateAsync(string caseText, List<RelevantDecisionDto> relevantDecisions);
    Task<CaseAnalysisResponse> AnalyzeCaseTextAsync(string caseText, string? fileUri = null, string? fileMimeType = null);
    Task<string> ExtractTextFromFileAsync(byte[] fileContent, string mimeType, string fileName);
    Task<GeminiFileResponse> UploadFileToGeminiAsync(Stream fileStream, string mimeType, string displayName);
}
