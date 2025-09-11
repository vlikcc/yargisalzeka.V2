namespace SearchService.Models;


public class SearchRequest
{
	// Frontend yalnızca keywords gönderir.
	public List<string> Keywords { get; set; } = new();
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

// Sade arama dönüş modeli (yalnızca kararlar + toplam)
public record SimpleSearchResponse(List<DecisionDto> Decisions, int TotalResults);

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

// Kullanıcı tarafında AI analiz & keyword extraction yapıldıktan sonra sadece karar araması için
public class ExecuteSearchRequest
{
	public string CaseText { get; set; } = string.Empty; // Relevance skorlaması için gerekli
	public List<string> Keywords { get; set; } = new();
}

public record ExecuteSearchResponse(
	List<ScoredDecisionDto> Decisions,
	int TotalResults
);


