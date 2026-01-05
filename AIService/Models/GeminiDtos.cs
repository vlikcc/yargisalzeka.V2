using System.ComponentModel.DataAnnotations;

namespace AIService.Models;

public class KeywordRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    public string? FileUri { get; set; }
    public string? FileMimeType { get; set; }
}

public class RelevanceRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    [Required]
    public string DecisionText { get; set; } = string.Empty;
}

public class RelevanceResponse
{
    public int Score { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public string Similarity { get; set; } = string.Empty;
}

public class RelevantDecisionDto
{
    public string? Title { get; set; }
    public string? Summary { get; set; }
}

public class PetitionRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    [Required]
    public List<RelevantDecisionDto> RelevantDecisions { get; set; } = new();
}

public class SearchDecisionsRequest
{
    [Required]
    public List<string> Keywords { get; set; } = new();
}

public class DecisionSearchResult
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public DateTime? DecisionDate { get; set; } // Nullable yap
    public string Court { get; set; } = string.Empty;
}

public class CaseAnalysisRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    public string? FileUri { get; set; }
    public string? FileMimeType { get; set; }
}

public class CaseAnalysisResponse
{
     public string AnalysisResult { get; set; } = string.Empty;
}

public class KeywordExtractionResponse
{
    public List<string> Keywords { get; set; } = new();
}

public class KeywordExtractionSearchResponse
{
    public List<string> Keywords { get; set; } = new();
    public List<DecisionSearchResult> Decisions { get; set; } = new();
    public int TotalResults { get; set; }
}

// Birleşik iş akışı için: olay metni -> analiz + keywords + top 3 scored decisions
public class CompositeSearchRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    public string? FileUri { get; set; }
    public string? FileMimeType { get; set; }
}

public class ScoredDecisionResult
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string? FullText { get; set; }
    public DateTime? DecisionDate { get; set; }
    public string Court { get; set; } = string.Empty;
    public int? Score { get; set; }
    public string? RelevanceExplanation { get; set; }
    public string? RelevanceSimilarity { get; set; }
}

public class CompositeSearchResponse
{
    public string Analysis { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    public List<ScoredDecisionResult> Decisions { get; set; } = new(); // Top 3
}

public class TestTokenRequest
{
    [Required]
    public string UserId { get; set; } = string.Empty;
    [Required]
    public string Email { get; set; } = string.Empty;
}

// Tam Akış (Full-Flow) için DTO'lar
public class FullFlowRequest
{
    [Required]
    public string CaseText { get; set; } = string.Empty;
    
    /// <summary>
    /// Eğer true ise, arama sonuçlarına göre dilekçe de oluşturulur
    /// </summary>
    public bool GeneratePetition { get; set; } = false;
    
    /// <summary>
    /// Dilekçe konusu (opsiyonel)
    /// </summary>
    public string? PetitionTopic { get; set; }
    
    public string? FileUri { get; set; }
    public string? FileMimeType { get; set; }
}

public class FullFlowResponse
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    
    // Adım 1: Olay Analizi
    public string Analysis { get; set; } = string.Empty;
    
    // Adım 2: Anahtar Kelimeler
    public List<string> Keywords { get; set; } = new();
    
    // Adım 3: Arama Sonuçları
    public int TotalDecisionsFound { get; set; }
    
    // Adım 4: En Uygun 3 Karar (skorlu)
    public List<ScoredDecisionResult> TopDecisions { get; set; } = new();
    
    // Adım 5: Dilekçe (opsiyonel)
    public bool PetitionGenerated { get; set; }
    public string? Petition { get; set; }
}

/// <summary>
/// Dosyadan metin çıkarma yanıtı
/// </summary>
public class FileExtractResponse
{
    public bool Success { get; set; }
    public string ExtractedText { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public string? FileName { get; set; }
    public string? MimeType { get; set; }
}