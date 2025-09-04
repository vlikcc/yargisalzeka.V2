namespace SearchService.Models;

public record SearchRequest(List<string> Keywords);

public record DecisionDto(
	long Id,
	string YargitayDairesi,
	string EsasNo,
	string KararNo,
	DateTime? KararTarihi, // Nullable yap
	string KararMetni
);


