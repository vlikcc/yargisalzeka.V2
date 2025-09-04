using System.Collections.Generic;
using System.Threading.Tasks;
using IdentityService.Controllers;
using IdentityService.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;
using System.Net.Http;
using System.Threading;

namespace IdentityService.UnitTests;

public class AuthControllerTests
{
    [Fact]
    public async Task Register_ReturnsConflict_WhenEmailExists()
    {
        var userMgr = Mocks.UserManagerMock();
        userMgr.Setup(m => m.FindByEmailAsync(It.IsAny<string>())).ReturnsAsync(new ApplicationUser{ Email="a@b.com"});
        var signIn = new Mock<SignInManager<ApplicationUser>>(userMgr.Object,
            Mock.Of<Microsoft.AspNetCore.Http.IHttpContextAccessor>(),
            Mock.Of<IUserClaimsPrincipalFactory<ApplicationUser>>(), null,null,null,null);
    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string>{{"Jwt:Key","testtesttesttesttesttesttesttest"}}).Build();
        var logger = Mock.Of<ILogger<AuthController>>();
    var factory = new Mock<IHttpClientFactory>();
    factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient(new FakeHandler()));
    var controller = new AuthController(userMgr.Object, signIn.Object, config, logger, factory.Object);

        var result = await controller.Register(new RegisterRequest{ Email="a@b.com", Password="Pass123!"});
        Assert.IsType<Microsoft.AspNetCore.Mvc.ConflictObjectResult>(result);
    }
}

internal class FakeHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
    }
}

internal static class Mocks
{
    public static Mock<UserManager<ApplicationUser>> UserManagerMock()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        return new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
    }
}
