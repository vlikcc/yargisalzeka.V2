using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IdentityService.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Net.Http.Json;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

    private readonly IHttpClientFactory _factory;

        public AuthController(UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IHttpClientFactory factory)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _logger = logger;
            _factory = factory;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing != null)
                return Conflict(new { Mesaj = "E-posta zaten kayıtlı" });

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email
            };

            IdentityResult result;
            try
            {
                result = await _userManager.CreateAsync(user, request.Password);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Kullanıcı kaydı sırasında beklenmeyen hata: {Email}", request.Email);
                return StatusCode(500, new { Message = "Kayıt sırasında beklenmeyen bir hata oluştu." });
            }

            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => $"{e.Code}: {e.Description}"));
                _logger.LogWarning("Kullanıcı kaydı başarısız: {Email} -> {Errors}", request.Email, errors);
                return BadRequest(result.Errors);
            }

            _logger.LogInformation("Yeni kullanıcı kaydedildi: {Email}", request.Email);

            // Trial abonelik ata (REST)
            try
            {
                var client = _factory.CreateClient("Subscription");
                var resp = await client.PostAsJsonAsync("api/subscription/assign-trial", new { UserId = user.Id });
                if (!resp.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Trial abonelik atama başarısız: {Status}", resp.StatusCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Trial abonelik atama denemesi başarısız (opsiyonel)");
            }

            var token = await GenerateJwtToken(user);
            return Ok(new AuthResponse { Token = token.Token, ExpiresAtUtc = token.ExpiresAtUtc });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                _logger.LogWarning("Geçersiz giriş denemesi (kullanıcı bulunamadı): {Email}", request.Email);
                return Unauthorized(new { Mesaj = "Geçersiz kimlik bilgileri" });
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
            if (!result.Succeeded)
            {
                _logger.LogWarning("Geçersiz giriş denemesi (şifre hatalı): {Email}", request.Email);
                return Unauthorized(new { Mesaj = "Geçersiz kimlik bilgileri" });
            }

            _logger.LogInformation("Kullanıcı giriş yaptı: {Email}", request.Email);
            var token = await GenerateJwtToken(user);
            return Ok(new AuthResponse { Token = token.Token, ExpiresAtUtc = token.ExpiresAtUtc });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized();

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
            {
                _logger.LogWarning("Şifre değiştirme başarısız: {UserId}", userId);
                return BadRequest(result.Errors);
            }

            _logger.LogInformation("Şifre başarıyla değiştirildi: {UserId}", userId);
            return Ok(new { Mesaj = "Şifre başarıyla değiştirildi" });
        }

        // Admin endpoints
        [HttpGet("users")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = _userManager.Users.Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email ?? string.Empty,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt,
                SubscriptionEndDate = u.SubscriptionEndDate
            }).ToList();

            return Ok(users);
        }

        [HttpPut("users/{userId}/role")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdateUserRole(string userId, [FromBody] UpdateRoleRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(new { Message = "Kullanıcı bulunamadı" });

            user.Role = request.Role;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            _logger.LogInformation("Kullanıcı rolü güncellendi: {UserId} -> {Role}", userId, request.Role);
            return Ok(new { Message = "Kullanıcı rolü güncellendi" });
        }

        [HttpPut("users/{userId}/status")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> ToggleUserStatus(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(new { Message = "Kullanıcı bulunamadı" });

            user.IsActive = !user.IsActive;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
                return BadRequest(result.Errors);

            _logger.LogInformation("Kullanıcı durumu güncellendi: {UserId} -> {Status}", userId, user.IsActive);
            return Ok(new { Message = $"Kullanıcı {(user.IsActive ? "aktif" : "pasif")} hale getirildi" });
        }

        [HttpDelete("users/{userId}")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> DeleteUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(new { Message = "Kullanıcı bulunamadı" });

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
                return BadRequest(result.Errors);

            _logger.LogInformation("Kullanıcı silindi: {UserId}", userId);
            return Ok(new { Message = "Kullanıcı başarıyla silindi" });
        }

        [HttpGet("admin-stats")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAdminStats()
        {
            var totalUsers = _userManager.Users.Count();
            var activeUsers = _userManager.Users.Count(u => u.IsActive);
            var adminUsers = _userManager.Users.Count(u => u.Role == "Admin" || u.Role == "SuperAdmin");
            var recentUsers = _userManager.Users.Count(u => u.CreatedAt > DateTime.UtcNow.AddDays(-7));

            return Ok(new
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                AdminUsers = adminUsers,
                RecentUsers = recentUsers,
                InactiveUsers = totalUsers - activeUsers
            });
        }

        // Create first admin user (for initial setup)
        [HttpPost("create-admin")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateFirstAdmin([FromBody] CreateAdminRequest request)
        {
            // Only allow if no admin users exist yet
            var existingAdmins = _userManager.Users.Count(u => u.Role == "Admin" || u.Role == "SuperAdmin");
            if (existingAdmins > 0)
            {
                return BadRequest(new { Message = "Admin kullanıcısı zaten mevcut" });
            }

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = "SuperAdmin",
                IsActive = true
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            _logger.LogInformation("İlk SuperAdmin kullanıcısı oluşturuldu: {Email}", request.Email);
            return Ok(new { Message = "SuperAdmin kullanıcısı başarıyla oluşturuldu" });
        }

        private async Task<(string Token, DateTime ExpiresAtUtc)> GenerateJwtToken(ApplicationUser user)
        {
            var key = _configuration["Jwt:Key"] ?? "insecure-dev-key-change-me-at-least-32-chars";
            if (key == "insecure-dev-key-change-me-at-least-32-chars")
            {
                _logger.LogWarning("JWT key missing in configuration. Using insecure default. Set Jwt__Key in environment or configuration for production.");
            }
            var issuer = _configuration["Jwt:Issuer"];
            var audience = _configuration["Jwt:Audience"];

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddHours(2);

            var tokenDescriptor = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: creds);

            var token = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
            return (token, expires);
        }
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
    }

    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime? SubscriptionEndDate { get; set; }
    }

    public class UpdateRoleRequest
    {
        public string Role { get; set; } = string.Empty; // User, Admin, SuperAdmin
    }

    public class CreateAdminRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
    }
}
