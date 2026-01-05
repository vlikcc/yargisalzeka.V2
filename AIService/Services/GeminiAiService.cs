using System.Text;
using System.Text.Json;
using AIService.Models;

namespace AIService.Services;

public class GeminiAiService : IGeminiAiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeminiAiService> _logger;
    private readonly string _apiKey;
    private const string FlashModel = "gemini-3-pro-preview";
    private const string ProModel = "gemini-3-pro-preview";

    public GeminiAiService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<GeminiAiService> logger)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
    }

    public async Task<GeminiFileResponse> UploadFileToGeminiAsync(Stream fileStream, string mimeType, string displayName)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) throw new InvalidOperationException("Gemini API key missing.");
        
        // 1. Step: Start Resumable Upload
        var client = _httpClientFactory.CreateClient("Gemini");
        var initialUrl = $"https://generativelanguage.googleapis.com/upload/v1beta/files?key={_apiKey}";
        
        var initialRequest = new HttpRequestMessage(HttpMethod.Post, initialUrl);
        initialRequest.Headers.Add("X-Goog-Upload-Protocol", "resumable");
        initialRequest.Headers.Add("X-Goog-Upload-Command", "start");
        initialRequest.Headers.Add("X-Goog-Upload-Header-Content-Length", fileStream.Length.ToString());
        initialRequest.Headers.Add("X-Goog-Upload-Header-Content-Type", mimeType);
        
        // Metadata for the file
        var metadata = new { file = new { display_name = displayName } };
        initialRequest.Content = new StringContent(JsonSerializer.Serialize(metadata), Encoding.UTF8, "application/json");

        var initialResponse = await client.SendAsync(initialRequest);
        initialResponse.EnsureSuccessStatusCode();
        
        var uploadUrl = initialResponse.Headers.GetValues("X-Goog-Upload-URL").FirstOrDefault();
        if (string.IsNullOrEmpty(uploadUrl)) throw new Exception("Failed to get upload URL from Gemini File API");

        // 2. Step: Upload the actual bytes
        var uploadRequest = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
        uploadRequest.Headers.Add("X-Goog-Upload-Protocol", "resumable");
        uploadRequest.Headers.Add("X-Goog-Upload-Command", "upload, finalize");
        uploadRequest.Headers.Add("X-Goog-Upload-Offset", "0");
        
        // StreamContent might need to be reset if stream position is not 0
        if (fileStream.Position != 0 && fileStream.CanSeek) fileStream.Position = 0;
        uploadRequest.Content = new StreamContent(fileStream);

        var uploadResponse = await client.SendAsync(uploadRequest);
        uploadResponse.EnsureSuccessStatusCode();

        var responseBody = await uploadResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement.GetProperty("file");
        
        return new GeminiFileResponse
        {
            FileUri = root.GetProperty("uri").GetString() ?? "",
            Name = root.GetProperty("name").GetString() ?? "",
            MimeType = root.GetProperty("mimeType").GetString() ?? ""
        };
    }

    // Updated signature to accept optional fileUri and fileMimeType
    public async Task<CaseAnalysisResponse> AnalyzeCaseTextAsync(string caseText, string? fileUri = null, string? fileMimeType = null)
    {
        // Prompt construction differs if file is present
        object[] parts;
        if (!string.IsNullOrEmpty(fileUri) && !string.IsNullOrEmpty(fileMimeType))
        {
             parts = new object[]
             {
                 new { text = $$"""
                 Aşağıdaki hukuki olay metnini (ve varsa ekteki dosyayı) analiz et.
                 Olay metni:
                 {{caseText}}
                 Aşağıdaki formatta cevap ver:
                 ANALIZ: [Kısa açıklama]
                 """ },
                 new { file_data = new { mime_type = fileMimeType, file_uri = fileUri } }
             };
        }
        else
        {
            parts = new object[]
            {
                new { text = $$"""
                Aşağıdaki hukuki olay metnini analiz et.
                Olay metni:
                {{caseText}}
                Aşağıdaki formatta cevap ver:
                ANALIZ: [Kısa açıklama]   
                """ }
            };
        }

        try
        {
            var text = await SendPromptPartsAsync(parts, ProModel);
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
    public async Task<List<string>> ExtractKeywordsFromCaseAsync(string caseText, string? fileUri = null, string? fileMimeType = null)
    {
        object[] parts;
        if (!string.IsNullOrEmpty(fileUri) && !string.IsNullOrEmpty(fileMimeType))
        {
             parts = new object[]
             {
                 new { text = $$"""
                 Aşağıdaki hukuki olay metnini (ve varsa ekteki dosyayı) analiz et ve Yargıtay kararlarında arama yapmak için en uygun anahtar kelimeleri çıkar.
                 Anahtar kelimeler Türk hukuku terminolojisine uygun olmalı.
                 
                 Olay metni:
                 {{caseText}}
                 
                 Sadece anahtar kelimeleri virgülle ayırarak listele. Açıklama yazma.
                 Örnek format: "tazminat, sözleşme ihlali, maddi zarar, manevi tazminat"
                 """ },
                 new { file_data = new { mime_type = fileMimeType, file_uri = fileUri } }
             };
        }
        else
        {
            parts = new object[]
            {
                new { text = $$"""
                Aşağıdaki hukuki olay metnini analiz et ve Yargıtay kararlarında arama yapmak için en uygun anahtar kelimeleri çıkar.
                Anahtar kelimeler Türk hukuku terminolojisine uygun olmalı.
                
                Olay metni:
                {{caseText}}
                
                Sadece anahtar kelimeleri virgülle ayırarak listele. Açıklama yazma.
                Örnek format: "tazminat, sözleşme ihlali, maddi zarar, manevi tazminat"
                """ }
            };
        }

        try
        {
            var text = await SendPromptPartsAsync(parts, FlashModel);
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
Aşağıdaki bilgileri kullanarak hukuki dilekçe şablonu oluştur. Dilekçe şablonunda hukuki bir dil kullan. Dilekçe şablonunda * # - gibi işaretler kullanma.
SADECE DİLEKÇE ŞABLONUNU ÜRET BAŞKA BİR YORUM YA DA AÇIKLAMA EKLEME.

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
        return await SendPromptPartsAsync(new object[] { new { text = prompt } }, model);
    }

    private async Task<string> SendPromptPartsAsync(object[] parts, string model)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) throw new InvalidOperationException("Gemini API key missing.");
        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={_apiKey}";
        
        var attempt = 0;
        var maxAttempts = 3; 
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
                            parts = parts
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
                        if (attempt >= maxAttempts) return string.Empty;
                    }
                }
                else
                {
                    var status = (int)response.StatusCode;
                    var transient = status is 429 or 500 or 502 or 503 or 504; 
                    if (!transient)
                    {
                        _logger.LogWarning("Gemini non-retryable status {Status} (attempt {Attempt}): {Body}", response.StatusCode, attempt, body);
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
                throw new HttpRequestException("Gemini API request failed after retries");
            }

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

    public async Task<string> ExtractTextFromFileAsync(byte[] fileContent, string mimeType, string fileName)
    {
        try
        {
            // Word dosyaları (.docx)
            if (mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                fileName.EndsWith(".docx", StringComparison.OrdinalIgnoreCase))
            {
                return ExtractTextFromWord(fileContent);
            }

            // Eski Word dosyaları (.doc) - basit metin çıkarımı
            if (mimeType == "application/msword" || fileName.EndsWith(".doc", StringComparison.OrdinalIgnoreCase))
            {
                // .doc dosyaları için basit metin çıkarımı dene
                var text = Encoding.UTF8.GetString(fileContent);
                // Basit temizleme
                text = System.Text.RegularExpressions.Regex.Replace(text, @"[\x00-\x1F\x7F]", " ");
                return text.Trim();
            }

            // Excel dosyaları (.xlsx)
            if (mimeType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            {
                return ExtractTextFromExcel(fileContent);
            }

            // Eski Excel dosyaları (.xls)
            if (mimeType == "application/vnd.ms-excel" || fileName.EndsWith(".xls", StringComparison.OrdinalIgnoreCase))
            {
                return "Eski Excel formatı (.xls) desteklenmiyor. Lütfen .xlsx formatına dönüştürün.";
            }

            // PDF ve resimler için Gemini Vision API kullan
            if (mimeType.StartsWith("image/") || mimeType == "application/pdf" ||
                fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                return await ExtractTextWithGeminiVision(fileContent, mimeType);
            }

            // Düz metin dosyaları
            if (mimeType == "text/plain" || fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase))
            {
                return Encoding.UTF8.GetString(fileContent);
            }

            return $"Desteklenmeyen dosya formatı: {mimeType}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dosyadan metin çıkarma hatası: {FileName}", fileName);
            return $"Dosya işlenirken hata oluştu: {ex.Message}";
        }
    }

    private string ExtractTextFromWord(byte[] fileContent)
    {
        try
        {
            using var stream = new MemoryStream(fileContent);
            using var doc = DocumentFormat.OpenXml.Packaging.WordprocessingDocument.Open(stream, false);
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body == null) return string.Empty;

            var sb = new StringBuilder();
            foreach (var para in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Paragraph>())
            {
                sb.AppendLine(para.InnerText);
            }
            return sb.ToString().Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Word dosyası işleme hatası");
            return $"Word dosyası okunamadı: {ex.Message}";
        }
    }

    private string ExtractTextFromExcel(byte[] fileContent)
    {
        try
        {
            using var stream = new MemoryStream(fileContent);
            using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
            var sb = new StringBuilder();

            foreach (var worksheet in workbook.Worksheets)
            {
                sb.AppendLine($"--- {worksheet.Name} ---");
                var range = worksheet.RangeUsed();
                if (range == null) continue;

                foreach (var row in range.Rows())
                {
                    var cells = row.Cells().Select(c => c.GetString()).ToList();
                    sb.AppendLine(string.Join("\t", cells));
                }
                sb.AppendLine();
            }
            return sb.ToString().Trim();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excel dosyası işleme hatası");
            return $"Excel dosyası okunamadı: {ex.Message}";
        }
    }

    private async Task<string> ExtractTextWithGeminiVision(byte[] fileContent, string mimeType)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) throw new InvalidOperationException("Gemini API key missing.");

        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ProModel}:generateContent?key={_apiKey}";

        // Base64 encode
        var base64Data = Convert.ToBase64String(fileContent);

        var prompt = "Bu belgedeki tüm metni Türkçe olarak oku ve yaz. Sadece belgedeki metni çıkar, yorum ekleme.";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = mimeType,
                                data = base64Data
                            }
                        }
                    }
                }
            }
        };

        var attempt = 0;
        var maxAttempts = 3;
        var rnd = new Random();

        while (true)
        {
            attempt++;
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json")
                };

                var response = await client.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
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

                var status = (int)response.StatusCode;
                if (status is not (429 or 500 or 502 or 503 or 504))
                {
                    _logger.LogWarning("Gemini Vision non-retryable status {Status}: {Body}", status, body);
                    return $"Dosya işlenemedi (HTTP {status})";
                }

                _logger.LogWarning("Gemini Vision transient failure {Status} (attempt {Attempt}/{MaxAttempts})", status, attempt, maxAttempts);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini Vision request exception (attempt {Attempt}/{MaxAttempts})", attempt, maxAttempts);
            }

            if (attempt >= maxAttempts)
            {
                return "Dosya işlenirken hata oluştu. Lütfen tekrar deneyin.";
            }

            var delayMs = (int)(Math.Pow(2, attempt - 1) * 250) + rnd.Next(0, 150);
            await Task.Delay(delayMs);
        }
    }
}
