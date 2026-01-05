using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using IdentityService.Entities;
using IdentityService.DbContexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
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
        private readonly IdentitiyDbContext _dbContext;

        public AuthController(UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IHttpClientFactory factory,
            IdentitiyDbContext dbContext)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _logger = logger;
            _factory = factory;
            _dbContext = dbContext;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                var errs = ModelState.Where(m => m.Value?.Errors?.Count > 0)
                    .ToDictionary(k => k.Key, v => v.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { Message = "Geçersiz alanlar", Errors = errs });
            }

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing != null)
                return Conflict(new { Mesaj = "E-posta zaten kayıtlı" });

            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName ?? string.Empty,
                LastName = request.LastName ?? string.Empty
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
                return BadRequest(new { Message = "Kayıt doğrulama hatası", Errors = result.Errors.Select(e => new { e.Code, e.Description }) });
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

            // Capturing IP and User Agent for session
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers["User-Agent"].ToString();

            // Create Session
            var sessionId = await CreateUserSession(user.Id, ipAddress, userAgent);

            var token = GenerateJwtToken(user, sessionId);
            return Ok(new AuthResponse { Token = token.Token, ExpiresAtUtc = token.ExpiresAtUtc });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = Request.Headers["User-Agent"].ToString();

                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    _logger.LogWarning("Geçersiz giriş denemesi (kullanıcı bulunamadı): {Email}", request.Email);
                    
                    // Başarısız giriş logu
                    await LogLoginAttempt(null, request.Email, false, "Kullanıcı bulunamadı", ipAddress, userAgent);
                    
                    return Unauthorized(new { Mesaj = "Kullanıcı bulunamadı" });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
                if (!result.Succeeded)
                {
                    string failureReason = "Hatalı şifre";
                    if (result.IsLockedOut) failureReason = "Hesap kilitli";
                    else if (result.IsNotAllowed) failureReason = "Giriş izni yok (Email onayı vb. gerekebilir)";
                    else if (result.RequiresTwoFactor) failureReason = "2FA gerekli";

                    _logger.LogWarning("Geçersiz giriş denemesi ({Reason}): {Email}", failureReason, request.Email);
                    
                    // Başarısız giriş logu
                    await LogLoginAttempt(user.Id, request.Email, false, failureReason, ipAddress, userAgent);
                    
                    return Unauthorized(new { Mesaj = $"Giriş başarısız: {failureReason}" });
                }

                // Başarılı giriş logu
                await LogLoginAttempt(user.Id, request.Email, true, null, ipAddress, userAgent);
                
                // LastLoginAt güncelle
                user.LastLoginAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                // Create Session (Invalidates old ones)
                var sessionId = await CreateUserSession(user.Id, ipAddress, userAgent);

                _logger.LogInformation("Kullanıcı giriş yaptı: {Email}", request.Email);
                var token = GenerateJwtToken(user, sessionId);
                return Ok(new AuthResponse { Token = token.Token, ExpiresAtUtc = token.ExpiresAtUtc });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login exception: {Message}", ex.Message);
                var innerMessage = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, new { Message = "Sunucu Hatası: " + ex.Message, InnerException = innerMessage, Detail = ex.StackTrace });
            }
        }

        [HttpPost("validate-session")]
        [AllowAnonymous] 
        public async Task<IActionResult> ValidateSession([FromBody] SessionValidationRequest request)
        {
            if (string.IsNullOrEmpty(request.SessionId))
                return BadRequest(new { Message = "SessionId is required" });

            var session = await _dbContext.UserSessions
                .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.IsActive);

            if (session == null)
            {
                return Unauthorized(new { Message = "Session invalid or expired" });
            }

            // Optional: Update LastActivityAt
            session.LastActivityAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return Ok(new { IsValid = true });
        }

        private async Task<string> CreateUserSession(string userId, string? ipAddress, string? userAgent)
        {
            // Invalidate existing active sessions
            var activeSessions = await _dbContext.UserSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();

            foreach (var session in activeSessions)
            {
                session.IsActive = false;
            }

            // Create new session
            var newSession = new UserSession
            {
                UserId = userId,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };
            
            _dbContext.UserSessions.Add(newSession);
            await _dbContext.SaveChangesAsync();

            return newSession.Id;
        }

        private async Task LogLoginAttempt(string? userId, string email, bool isSuccess, string? failureReason, string? ipAddress, string? userAgent)
        {
            try
            {
                var log = new LoginLog
                {
                    UserId = userId ?? string.Empty,
                    Email = email,
                    IsSuccess = isSuccess,
                    FailureReason = failureReason,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.LoginLogs.Add(log);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Giriş logu kaydedilemedi");
            }
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
    public IActionResult GetAllUsers()
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
        public IActionResult GetAdminStats()
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

        // Giriş logları
        [HttpGet("login-logs")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetLoginLogs([FromQuery] int take = 100, [FromQuery] int skip = 0, [FromQuery] bool? success = null)
        {
            take = Math.Clamp(take, 1, 500);
            
            var query = _dbContext.LoginLogs.AsQueryable();
            
            if (success.HasValue)
            {
                query = query.Where(l => l.IsSuccess == success.Value);
            }
            
            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(l => new LoginLogDto
                {
                    Id = l.Id,
                    UserId = l.UserId,
                    Email = l.Email,
                    IsSuccess = l.IsSuccess,
                    FailureReason = l.FailureReason,
                    IpAddress = l.IpAddress,
                    UserAgent = l.UserAgent,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();
            
            var totalCount = await query.CountAsync();
            
            return Ok(new { logs, totalCount });
        }

        // Giriş istatistikleri
        [HttpGet("login-stats")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetLoginStats([FromQuery] int days = 30)
        {
            days = Math.Clamp(days, 1, 365);
            var startDate = DateTime.UtcNow.AddDays(-days);
            
            var totalAttempts = await _dbContext.LoginLogs.CountAsync(l => l.CreatedAt >= startDate);
            var successfulLogins = await _dbContext.LoginLogs.CountAsync(l => l.CreatedAt >= startDate && l.IsSuccess);
            var failedLogins = totalAttempts - successfulLogins;
            
            // Günlük giriş sayıları
            var dailyLogins = await _dbContext.LoginLogs
                .Where(l => l.CreatedAt >= startDate)
                .GroupBy(l => new { l.CreatedAt.Date, l.IsSuccess })
                .Select(g => new { Date = g.Key.Date, IsSuccess = g.Key.IsSuccess, Count = g.Count() })
                .ToListAsync();
            
            var dailyStats = dailyLogins
                .GroupBy(d => d.Date)
                .Select(g => new DailyLoginStats
                {
                    Date = g.Key,
                    SuccessCount = g.Where(x => x.IsSuccess).Sum(x => x.Count),
                    FailCount = g.Where(x => !x.IsSuccess).Sum(x => x.Count)
                })
                .OrderBy(d => d.Date)
                .ToList();
            
            // Başarısız giriş nedenleri
            var failureReasons = await _dbContext.LoginLogs
                .Where(l => l.CreatedAt >= startDate && !l.IsSuccess && l.FailureReason != null)
                .GroupBy(l => l.FailureReason)
                .Select(g => new { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync();
            
            // Şüpheli aktivite: Aynı IP'den çok fazla başarısız giriş
            var suspiciousIps = await _dbContext.LoginLogs
                .Where(l => l.CreatedAt >= startDate && !l.IsSuccess && l.IpAddress != null)
                .GroupBy(l => l.IpAddress)
                .Select(g => new { IpAddress = g.Key, FailCount = g.Count() })
                .Where(x => x.FailCount >= 5)
                .OrderByDescending(x => x.FailCount)
                .Take(10)
                .ToListAsync();
            
            return Ok(new
            {
                totalAttempts,
                successfulLogins,
                failedLogins,
                successRate = totalAttempts > 0 ? Math.Round((double)successfulLogins / totalAttempts * 100, 1) : 0,
                dailyStats,
                failureReasons,
                suspiciousIps
            });
        }

        // Duyurular - Herkese açık (aktif olanlar)
        [HttpGet("announcements")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveAnnouncements()
        {
            var now = DateTime.UtcNow;
            var announcements = await _dbContext.Announcements
                .Where(a => a.IsActive && 
                           (a.StartDate == null || a.StartDate <= now) &&
                           (a.EndDate == null || a.EndDate >= now))
                .OrderByDescending(a => a.CreatedAt)
                .Take(10)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    Type = a.Type,
                    IsActive = a.IsActive,
                    ShowOnDashboard = a.ShowOnDashboard,
                    StartDate = a.StartDate,
                    EndDate = a.EndDate,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
            
            return Ok(announcements);
        }

        // Admin - Tüm duyurular
        [HttpGet("admin/announcements")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> GetAllAnnouncements()
        {
            var announcements = await _dbContext.Announcements
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AnnouncementDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    Type = a.Type,
                    IsActive = a.IsActive,
                    ShowOnDashboard = a.ShowOnDashboard,
                    StartDate = a.StartDate,
                    EndDate = a.EndDate,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
            
            return Ok(announcements);
        }

        // Admin - Duyuru oluştur
        [HttpPost("admin/announcements")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
        {
            var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            
            var announcement = new Announcement
            {
                Title = request.Title,
                Content = request.Content,
                Type = request.Type,
                ShowOnDashboard = request.ShowOnDashboard,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                IsActive = true,
                CreatedBy = userId ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };
            
            _dbContext.Announcements.Add(announcement);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Yeni duyuru oluşturuldu: {Title}", request.Title);
            return Ok(new { Id = announcement.Id, Message = "Duyuru başarıyla oluşturuldu" });
        }

        // Admin - Duyuru güncelle
        [HttpPut("admin/announcements/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> UpdateAnnouncement(long id, [FromBody] CreateAnnouncementRequest request)
        {
            var announcement = await _dbContext.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound(new { Message = "Duyuru bulunamadı" });
            
            announcement.Title = request.Title;
            announcement.Content = request.Content;
            announcement.Type = request.Type;
            announcement.ShowOnDashboard = request.ShowOnDashboard;
            announcement.StartDate = request.StartDate;
            announcement.EndDate = request.EndDate;
            announcement.UpdatedAt = DateTime.UtcNow;
            
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Duyuru güncellendi: {Id}", id);
            return Ok(new { Message = "Duyuru başarıyla güncellendi" });
        }

        // Admin - Duyuru aktif/pasif yap
        [HttpPut("admin/announcements/{id}/toggle")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> ToggleAnnouncement(long id)
        {
            var announcement = await _dbContext.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound(new { Message = "Duyuru bulunamadı" });
            
            announcement.IsActive = !announcement.IsActive;
            announcement.UpdatedAt = DateTime.UtcNow;
            
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Duyuru durumu değiştirildi: {Id} -> {Status}", id, announcement.IsActive);
            return Ok(new { Message = $"Duyuru {(announcement.IsActive ? "aktif" : "pasif")} hale getirildi" });
        }

        // Admin - Duyuru sil
        [HttpDelete("admin/announcements/{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteAnnouncement(long id)
        {
            var announcement = await _dbContext.Announcements.FindAsync(id);
            if (announcement == null)
                return NotFound(new { Message = "Duyuru bulunamadı" });
            
            _dbContext.Announcements.Remove(announcement);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Duyuru silindi: {Id}", id);
            return Ok(new { Message = "Duyuru başarıyla silindi" });
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

    private (string Token, DateTime ExpiresAtUtc) GenerateJwtToken(ApplicationUser user, string sessionId)
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
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("sid", sessionId) // Session ID claim
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
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
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

    public class LoginLogDto
    {
        public long Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string? FailureReason { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class DailyLoginStats
    {
        public DateTime Date { get; set; }
        public int SuccessCount { get; set; }
        public int FailCount { get; set; }
    }

    public class AnnouncementDto
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = "info";
        public bool IsActive { get; set; }
        public bool ShowOnDashboard { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAnnouncementRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Type { get; set; } = "info";
        public bool ShowOnDashboard { get; set; } = true;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class SessionValidationRequest
    {
        public string SessionId { get; set; } = string.Empty;
    }
}
