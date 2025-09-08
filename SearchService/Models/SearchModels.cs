namespace SearchService.Models;

// Genişletilmiş arama isteği: Frontend artık anahtar kelimeleri ve analiz atlama bayrağını gönderebilir.
// CaseText zorunlu, Keywords opsiyonel. Frontend AI analiz & keyword extraction yaptıysa SkipAnalysis=true + Keywords gönderir.
public class SearchRequest
{
	public string CaseText { get; set; } = string.Empty;
	public List<string>? Keywords { get; set; } // Frontend'ten gelen temiz anahtar kelimeler
	public bool SkipAnalysis { get; set; } = false; // true ise backend yeniden AI analiz yapmaz
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


