namespace SearchService.Models;

public record SearchRequest(string CaseText);

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


