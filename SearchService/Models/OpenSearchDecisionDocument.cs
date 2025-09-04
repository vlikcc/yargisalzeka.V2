namespace SearchService.Models;

public class OpenSearchDecisionDocument
{
	public long Id { get; set; }
	public string YargitayDairesi { get; set; } = string.Empty;
	public string EsasNo { get; set; } = string.Empty;
	public string KararNo { get; set; } = string.Empty;
	public DateTime? KararTarihi { get; set; } // Nullable yap
	public string KararMetni { get; set; } = string.Empty;
}


