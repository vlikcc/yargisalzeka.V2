namespace SearchService.Models;

// Genişletilmiş arama isteği: Frontend artık anahtar kelimeleri ve analiz atlama bayrağını gönderebilir.
// CaseText zorunlu, Keywords opsiyonel. Frontend AI analiz & keyword extraction yaptıysa SkipAnalysis=true + Keywords gönderir.
public class SearchRequest
{
	// Kullanıcı yalnızca olay metni gönderir; backend AI ile analiz & anahtar kelime çıkarır.
	public string CaseText { get; set; } = string.Empty;
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


