using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using AIService.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Xunit;

namespace AIService.UnitTests;

public class GeminiAiServiceTests
{
    [Fact]
    public async Task ExtractKeywords_ReturnsParsedList()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"tazminat, sözleşme, faiz\"}]}}]}")
            });
        var client = new HttpClient(handler.Object);
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(client);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"Gemini:ApiKey","dummy"}}).Build();
        var logger = Mock.Of<ILogger<GeminiAiService>>();
        var svc = new GeminiAiService(config, factory.Object, logger);

        var list = await svc.ExtractKeywordsFromCaseAsync("Olay metni");
        Assert.Contains("tazminat", list);
        Assert.Equal(3, list.Count);
    }
}
