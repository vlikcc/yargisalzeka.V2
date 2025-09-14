namespace SearchService.Entities;

public class Decision
{
	public long Id { get; set; }
	public string YargitayDairesi { get; set; } = string.Empty;
	public string EsasNo { get; set; } = string.Empty;
	public string KararNo { get; set; } = string.Empty;
	public DateTime? KararTarihi { get; set; } // Nullable yap
	public string KararMetni { get; set; } = string.Empty;

	// PostgreSQL'deki search_vector alanı ile eşleşen property
	public string? SearchVector { get; set; }
}


