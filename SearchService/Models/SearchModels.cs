namespace SearchService.Models;

// Yeni arama isteği: Sadece anahtar kelimelerle arama yapılacak
// Frontend AI analiz ve keyword extraction yaptıktan sonra sadece keywords gönderir
public class SearchRequest
{
	public List<string> Keywords { get; set; } = new(); // Zorunlu anahtar kelimeler listesi
}

public record DecisionDto(
	long Id,
	string YargitayDairesi,
	string EsasNo,
	string KararNo,
	DateTime? KararTarihi, // Nullable yap
	string KararMetni
);

// AI Service ile iletişim için DTOs
public record KeywordExtractionRequest(string CaseText);
public record KeywordExtractionResponse(List<string> Keywords);

// AI Service'den gelen analiz sonuçları
public record CaseAnalysisResponse(string AnalysisResult);
public record KeywordExtractionResult(List<string> Keywords);

// Frontend'e döndürülecek kapsamlı response
public record SearchResponse(
	List<DecisionDto> Decisions,
	CaseAnalysisResponse Analysis,
	KeywordExtractionResult Keywords,
	int TotalResults
);

// Yeni asenkron akış DTO'ları
public class InitSearchRequest
{
	public string CaseText { get; set; } = string.Empty;
}

public record InitSearchResponse(string SearchId, CaseAnalysisResponse Analysis, KeywordExtractionResult Keywords);

public record ScoredDecisionDto(
	long Id,
	string YargitayDairesi,
	string EsasNo,
	string KararNo,
	DateTime? KararTarihi,
	string KararMetni,
	int? Score,
	string? RelevanceExplanation,
	string? RelevanceSimilarity
);

public record SearchResultResponse(
	string SearchId,
	string Status,
	CaseAnalysisResponse Analysis,
	KeywordExtractionResult Keywords,
	List<ScoredDecisionDto> Decisions,
	string? Error
);


