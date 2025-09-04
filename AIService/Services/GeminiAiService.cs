using System.Text;
using System.Text.Json;
using AIService.Models;

namespace AIService.Services;

public class GeminiAiService : IGeminiAiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeminiAiService> _logger;
    private readonly string _apiKey;
    private const string FlashModel = "gemini-2.5-pro";
    private const string ProModel = "gemini-2.5-pro";

    public GeminiAiService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<GeminiAiService> logger)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
    }

    public async Task<CaseAnalysisResponse> AnalyzeCaseTextAsync(string caseText)
    {
        var prompt = $$"""
        Aşağıdaki hukuki olay metnini analiz et.
        Olay metni:
        {{caseText}}
        Aşağıdaki formatta cevap ver:
        ANALIZ: [Kısa açıklama]   
        """;
        try
        {
            var text = await SendPromptAsync(prompt, ProModel);
            return new CaseAnalysisResponse { AnalysisResult = text };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Olay metni analiz hatası");
            return new CaseAnalysisResponse { AnalysisResult = "Olay metni analiz hatası" };
        }
    }
    public async Task<List<string>> ExtractKeywordsFromCaseAsync(string caseText)
    {
        var prompt = $$"""
Aşağıdaki hukuki olay metnini analiz et ve Yargıtay kararlarında arama yapmak için en uygun anahtar kelimeleri çıkar.
Anahtar kelimeler Türk hukuku terminolojisine uygun olmalı.

Olay metni:
{{caseText}}

Sadece anahtar kelimeleri virgülle ayırarak listele. Açıklama yazma.
Örnek format: "tazminat, sözleşme ihlali, maddi zarar, manevi tazminat"
""";
        try
        {
            var text = await SendPromptAsync(prompt, FlashModel);
            var kws = text.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                          .Select(k => k.Trim())
                          .Where(k => k.Length > 0)
                          .Distinct(StringComparer.OrdinalIgnoreCase)
                          .ToList();
            return kws;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anahtar kelime çıkarma hatası");
            return ex.Message.Split(',').ToList();
        }
    }

    public async Task<RelevanceResponse> AnalyzeDecisionRelevanceAsync(string caseText, string decisionText)
    {
        var truncated = decisionText;
        var prompt = $$"""
Olay metni ile Yargıtay kararı arasındaki ilişkiyi analiz et.

OLAY METNİ:
{{caseText}}

YARGITAY KARARI (kısaltılmış):
{{truncated}}

Aşağıdaki formatta cevap ver:
PUAN: [0-100 arası sayı]
AÇIKLAMA: [Kısa açıklama]
BENZERLİK: [Hangi konularda benzer]
""";
        try
        {
            var text = await SendPromptAsync(prompt, ProModel);
            return ParseAnalysisResponse(text);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Karar analiz hatası");
            return new RelevanceResponse { Score = 50, Explanation = "Analiz sırasında hata oluştu", Similarity = "Belirlenemedi" };
        }
    }

    public async Task<string> GeneratePetitionTemplateAsync(string caseText, List<RelevantDecisionDto> relevantDecisions)
    {
        var sb = new StringBuilder();
        foreach (var d in relevantDecisions.Take(3))
        {
            var summary = d.Summary;
            if (!string.IsNullOrEmpty(summary) && summary.Length > 200) summary = summary[..200];
            sb.AppendLine($"- {d.Title ?? "Başlık yok"}: {summary ?? "Özet yok"}");
        }
        var prompt = $$"""
Aşağıdaki bilgileri kullanarak hukuki dilekçe şablonu oluştur.

OLAY METNİ:
{{caseText}}

ALAKALI YARGITAY KARARLARI:
{{sb}}

Standart hukuki dilekçe formatında, emsal kararları referans alan bir şablon üret.
Bölümler:
- Başlık
- Taraflar
- Olaylar
- Hukuki Dayanak
- Emsal Kararlar
- Talep
""";
        try
        {
            var text = await SendPromptAsync(prompt, ProModel);
            return text.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dilekçe oluşturma hatası");
            return "Dilekçe şablonu oluşturulamadı. Lütfen tekrar deneyin.";
        }
    }

    private async Task<string> SendPromptAsync(string prompt, string model)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) throw new InvalidOperationException("Gemini API key missing.");
        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]{ new { text = prompt } }
                    }
                }
            }), Encoding.UTF8, "application/json")
        };

        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini API failure {Status}: {Body}", response.StatusCode, body);
            throw new HttpRequestException($"Gemini API error {(int)response.StatusCode}");
        }
        try
        {
            using var doc = JsonDocument.Parse(body);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();
            return text ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini API response parse error: {Body}", body);
            return string.Empty;
        }
    }

    private RelevanceResponse ParseAnalysisResponse(string text)
    {
        var resp = new RelevanceResponse { Score = 50, Explanation = "Analiz tamamlandı", Similarity = "Genel" };
        foreach (var line in text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (line.StartsWith("PUAN:", StringComparison.OrdinalIgnoreCase) && int.TryParse(line.Split(':', 2)[1].Trim(), out var s))
                resp.Score = Math.Clamp(s, 0, 100);
            else if (line.StartsWith("AÇIKLAMA:", StringComparison.OrdinalIgnoreCase))
                resp.Explanation = line.Split(':', 2)[1].Trim();
            else if (line.StartsWith("BENZER", StringComparison.OrdinalIgnoreCase))
                resp.Similarity = line.Split(':', 2)[1].Trim();
        }
        return resp;
    }
}
