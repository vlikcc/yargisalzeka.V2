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
            // Normalize: extract the line starting with ANALIZ: if present
            if (!string.IsNullOrWhiteSpace(text))
            {
                var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var analitik = lines.FirstOrDefault(l => l.StartsWith("ANALIZ:", StringComparison.OrdinalIgnoreCase));
                if (analitik != null)
                {
                    var idx = analitik.IndexOf(':');
                    if (idx >= 0 && idx < analitik.Length - 1)
                        text = analitik[(idx + 1)..].Trim();
                }
                // fallback shorten very long raw text
                if (text.Length > 1200) text = text[..1200] + "...";
            }
            return new CaseAnalysisResponse { AnalysisResult = string.IsNullOrWhiteSpace(text) ? "" : text };
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
            if (string.IsNullOrWhiteSpace(text)) return new List<string>();
            // Replace newlines and semicolons with commas to simplify splitting
            var normalized = text.Replace('\n', ',').Replace(';', ',');
            // Remove quotes
            normalized = normalized.Replace("\"", "").Replace("'", "");
            // Split on commas and also handle bullet markers
            var rawParts = normalized
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .SelectMany(p => p.Split('•', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .SelectMany(p => p.Split('-', StringSplitOptions.TrimEntries))
                .Select(p => p.Trim())
                .Where(p => p.Length > 0);

            var kws = rawParts
                .Select(k => k.ToLowerInvariant())
                .Where(k => k.Length <= 60 && !k.Contains("error") && !k.StartsWith("analiz"))
                .Select(k => k.Trim())
                .Distinct()
                .ToList();
            return kws;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anahtar kelime çıkarma hatası");
            // Kullanıcıya ham hata metnini anahtar kelime gibi göstermemek için boş liste dönüyoruz
            return new List<string>();
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
        // Minimal manual retry (no Polly dependency) with exponential backoff + jitter
        var attempt = 0;
        var maxAttempts = 3; // initial + 2 retries
        var rnd = new Random();
        while (true)
        {
            attempt++;
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

            HttpResponseMessage? response = null;
            string body = string.Empty;
            try
            {
                response = await client.SendAsync(request);
                body = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
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
                    catch (Exception parseEx)
                    {
                        _logger.LogError(parseEx, "Gemini API response parse error (attempt {Attempt}): {Body}", attempt, body);
                        // Parsing problem unlikely to be solved by retry unless malformed transient JSON; we retry once more if attempts remain.
                        if (attempt >= maxAttempts) return string.Empty;
                    }
                }
                else
                {
                    var status = (int)response.StatusCode;
                    var transient = status is 429 or 500 or 502 or 503 or 504; // treat these as retryable
                    if (!transient)
                    {
                        _logger.LogWarning("Gemini non-retryable status {Status} (attempt {Attempt}): {Body}", response.StatusCode, attempt, body);
                        // Don't leak status code details upward to UI; generic message.
                        throw new HttpRequestException("Gemini API request failed");
                    }
                    _logger.LogWarning("Gemini transient failure {Status} (attempt {Attempt}/{MaxAttempts}): {Body}", response.StatusCode, attempt, maxAttempts, body);
                }
            }
            catch (TaskCanceledException tex)
            {
                _logger.LogWarning(tex, "Gemini request timeout/cancelled (attempt {Attempt}/{MaxAttempts})", attempt, maxAttempts);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini request exception (attempt {Attempt}/{MaxAttempts})", attempt, maxAttempts);
            }
            finally
            {
                response?.Dispose();
            }

            if (attempt >= maxAttempts)
            {
                // Give up gracefully; outer method will choose fallback behavior.
                throw new HttpRequestException("Gemini API request failed after retries");
            }

            // Exponential backoff with jitter (base 250ms)
            var delayMs = (int)(Math.Pow(2, attempt - 1) * 250) + rnd.Next(0, 150);
            await Task.Delay(delayMs);
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
