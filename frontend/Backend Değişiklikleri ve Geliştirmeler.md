# Backend Değişiklikleri ve Geliştirmeler

## SubscriptionService Geliştirmeleri

### Yeni Entity Modelleri

#### SubscriptionPlan Entity
```csharp
public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Name { get; set; } // "Trial", "Temel", "Standart", "Premium"
    public decimal Price { get; set; }
    public int? ValidityDays { get; set; } // null = sınırsız, 3 = trial için
    public int KeywordExtractionLimit { get; set; } // -1 = sınırsız
    public int CaseAnalysisLimit { get; set; }
    public int SearchLimit { get; set; }
    public int PetitionLimit { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

#### UserSubscription Entity
```csharp
public class UserSubscription
{
    public int Id { get; set; }
    public string UserId { get; set; } // IdentityService'den gelen user ID
    public int SubscriptionPlanId { get; set; }
    public SubscriptionPlan SubscriptionPlan { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

#### UsageTracking Entity
```csharp
public class UsageTracking
{
    public int Id { get; set; }
    public string UserId { get; set; }
    public int UserSubscriptionId { get; set; }
    public UserSubscription UserSubscription { get; set; }
    public string FeatureType { get; set; } // "KeywordExtraction", "CaseAnalysis", "Search", "Petition"
    public int UsedCount { get; set; }
    public DateTime LastUsed { get; set; }
    public DateTime ResetDate { get; set; } // Aylık reset için
}
```

### Yeni Controller Endpointleri

#### SubscriptionController
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    // Kullanıcının mevcut aboneliğini getir
    [HttpGet("current")]
    public async Task<ActionResult<UserSubscriptionDto>> GetCurrentSubscription()
    
    // Tüm abonelik paketlerini listele
    [HttpGet("plans")]
    public async Task<ActionResult<List<SubscriptionPlanDto>>> GetSubscriptionPlans()
    
    // Abonelik paketi değiştir
    [HttpPost("upgrade")]
    public async Task<ActionResult> UpgradeSubscription([FromBody] UpgradeSubscriptionRequest request)
    
    // Kullanım istatistiklerini getir
    [HttpGet("usage")]
    public async Task<ActionResult<UsageStatsDto>> GetUsageStats()
    
    // Kalan kredileri getir
    [HttpGet("remaining-credits")]
    public async Task<ActionResult<RemainingCreditsDto>> GetRemainingCredits()
    
    // Özellik kullanımını kaydet
    [HttpPost("consume")]
    public async Task<ActionResult> ConsumeFeature([FromBody] ConsumeFeatureRequest request)
    
    // Trial abonelik ata (kayıt sonrası)
    [HttpPost("assign-trial")]
    public async Task<ActionResult> AssignTrialSubscription([FromBody] AssignTrialRequest request)
}
```

### Yeni gRPC Servisleri

#### SubscriptionGrpcService Genişletmeleri
```csharp
public class SubscriptionGrpcService : Subscription.SubscriptionBase
{
    // Mevcut CheckSubscriptionStatus metoduna ek olarak:
    
    public override async Task<ConsumeFeatureResponse> ConsumeFeature(
        ConsumeFeatureRequest request, ServerCallContext context)
    
    public override async Task<GetRemainingCreditsResponse> GetRemainingCredits(
        GetRemainingCreditsRequest request, ServerCallContext context)
    
    public override async Task<ValidateFeatureAccessResponse> ValidateFeatureAccess(
        ValidateFeatureAccessRequest request, ServerCallContext context)
}
```

### Database Migration Scripts

#### Initial Subscription Schema
```sql
-- SubscriptionPlans tablosu
CREATE TABLE SubscriptionPlans (
    Id SERIAL PRIMARY KEY,
    Name VARCHAR(50) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    ValidityDays INT NULL,
    KeywordExtractionLimit INT NOT NULL DEFAULT -1,
    CaseAnalysisLimit INT NOT NULL DEFAULT 0,
    SearchLimit INT NOT NULL DEFAULT 0,
    PetitionLimit INT NOT NULL DEFAULT 0,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserSubscriptions tablosu
CREATE TABLE UserSubscriptions (
    Id SERIAL PRIMARY KEY,
    UserId VARCHAR(450) NOT NULL,
    SubscriptionPlanId INT NOT NULL,
    StartDate TIMESTAMP NOT NULL,
    EndDate TIMESTAMP NULL,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SubscriptionPlanId) REFERENCES SubscriptionPlans(Id)
);

-- UsageTracking tablosu
CREATE TABLE UsageTracking (
    Id SERIAL PRIMARY KEY,
    UserId VARCHAR(450) NOT NULL,
    UserSubscriptionId INT NOT NULL,
    FeatureType VARCHAR(50) NOT NULL,
    UsedCount INT NOT NULL DEFAULT 0,
    LastUsed TIMESTAMP NULL,
    ResetDate TIMESTAMP NOT NULL,
    FOREIGN KEY (UserSubscriptionId) REFERENCES UserSubscriptions(Id)
);

-- Varsayılan abonelik paketlerini ekle
INSERT INTO SubscriptionPlans (Name, Price, ValidityDays, KeywordExtractionLimit, CaseAnalysisLimit, SearchLimit, PetitionLimit) VALUES
('Trial', 0.00, 3, -1, 5, 5, 1),
('Temel', 199.00, NULL, -1, 5, 5, 0),
('Standart', 499.00, NULL, -1, 50, 250, 10),
('Premium', 999.00, NULL, -1, -1, -1, -1);
```

## IdentityService Geliştirmeleri

### AuthController Güncellemeleri

#### Register Endpoint Güncellemesi
```csharp
[HttpPost("register")]
public async Task<ActionResult> Register([FromBody] RegisterRequest request)
{
    // Mevcut kullanıcı kayıt işlemi
    var result = await _userManager.CreateAsync(user, request.Password);
    
    if (result.Succeeded)
    {
        // JWT token oluştur
        var token = await GenerateJwtToken(user);
        
        // SubscriptionService'e trial abonelik ataması için gRPC çağrısı
        await _subscriptionGrpcClient.AssignTrialSubscription(new AssignTrialRequest 
        { 
            UserId = user.Id 
        });
        
        return Ok(new RegisterResponse 
        { 
            Token = token, 
            User = MapToUserDto(user),
            Message = "Kayıt başarılı. 3 günlük trial aboneliğiniz aktif edildi."
        });
    }
    
    return BadRequest(result.Errors);
}
```

### Yeni DTO Modelleri

#### UserProfileDto
```csharp
public class UserProfileDto
{
    public string Id { get; set; }
    public string Email { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
    public bool IsEmailConfirmed { get; set; }
}
```

## AIService Geliştirmeleri

### Yeni Controller Endpointleri

#### CaseAnalysisController
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CaseAnalysisController : ControllerBase
{
    [HttpPost("analyze-case")]
    public async Task<ActionResult<CaseAnalysisResponse>> AnalyzeCase([FromBody] CaseAnalysisRequest request)
    {
        // Abonelik kontrolü
        var subscriptionCheck = await _subscriptionGrpcClient.ValidateFeatureAccess(
            new ValidateFeatureAccessRequest 
            { 
                UserId = GetCurrentUserId(), 
                FeatureType = "CaseAnalysis" 
            });
            
        if (!subscriptionCheck.HasAccess)
            return Forbid("Olay analizi hakkınız bulunmamaktadır.");
            
        // AI analizi yap
        var analysis = await _geminiService.AnalyzeCaseAsync(request.CaseText);
        
        // Kullanımı kaydet
        await _subscriptionGrpcClient.ConsumeFeature(new ConsumeFeatureRequest 
        { 
            UserId = GetCurrentUserId(), 
            FeatureType = "CaseAnalysis" 
        });
        
        return Ok(analysis);
    }
    
    [HttpPost("score-decisions")]
    public async Task<ActionResult<DecisionScoringResponse>> ScoreDecisions([FromBody] DecisionScoringRequest request)
    {
        // AI ile kararları puanla
        var scoredDecisions = await _geminiService.ScoreDecisionsAsync(request.Decisions, request.CaseText);
        
        return Ok(new DecisionScoringResponse 
        { 
            ScoredDecisions = scoredDecisions.OrderByDescending(d => d.Score).Take(3).ToList() 
        });
    }
}
```

### GeminiService Genişletmeleri

#### Yeni Servis Metodları
```csharp
public class GeminiService : IGeminiService
{
    public async Task<CaseAnalysisResult> AnalyzeCaseAsync(string caseText)
    {
        var prompt = $@"
        Aşağıdaki hukuki olayı analiz et ve şu bilgileri çıkar:
        1. Olay türü (ceza, medeni, ticaret, vs.)
        2. Ana hukuki konular
        3. Olası hukuki sonuçlar
        4. İlgili mevzuat önerileri
        
        Olay metni: {caseText}
        
        Yanıtı JSON formatında ver.
        ";
        
        var result = await _geminiClient.GenerateContentAsync(prompt);
        return JsonSerializer.Deserialize<CaseAnalysisResult>(result.Text);
    }
    
    public async Task<List<ScoredDecision>> ScoreDecisionsAsync(List<Decision> decisions, string caseText)
    {
        var scoredDecisions = new List<ScoredDecision>();
        
        foreach (var decision in decisions)
        {
            var prompt = $@"
            Aşağıdaki mahkeme kararının, verilen olayla ne kadar uyumlu olduğunu 0-100 arasında puanla:
            
            Olay: {caseText}
            Karar: {decision.Content}
            
            Sadece sayısal puan ver.
            ";
            
            var result = await _geminiClient.GenerateContentAsync(prompt);
            if (int.TryParse(result.Text.Trim(), out int score))
            {
                scoredDecisions.Add(new ScoredDecision 
                { 
                    Decision = decision, 
                    Score = score 
                });
            }
        }
        
        return scoredDecisions;
    }
}
```

## DocumentService Geliştirmeleri

### PetitionController
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PetitionController : ControllerBase
{
    [HttpPost("generate")]
    public async Task<ActionResult<PetitionResponse>> GeneratePetition([FromBody] PetitionRequest request)
    {
        // Abonelik kontrolü
        var subscriptionCheck = await _subscriptionGrpcClient.ValidateFeatureAccess(
            new ValidateFeatureAccessRequest 
            { 
                UserId = GetCurrentUserId(), 
                FeatureType = "Petition" 
            });
            
        if (!subscriptionCheck.HasAccess)
            return Forbid("Dilekçe hazırlama hakkınız bulunmamaktadır.");
            
        // Dilekçe oluştur
        var petition = await _petitionService.GeneratePetitionAsync(request);
        
        // Kullanımı kaydet
        await _subscriptionGrpcClient.ConsumeFeature(new ConsumeFeatureRequest 
        { 
            UserId = GetCurrentUserId(), 
            FeatureType = "Petition" 
        });
        
        return Ok(petition);
    }
}
```

## SearchService Entegrasyonu

### SearchController Güncellemeleri
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    [HttpPost("search")]
    public async Task<ActionResult<SearchResponse>> Search([FromBody] SearchRequest request)
    {
        // Abonelik kontrolü
        var subscriptionCheck = await _subscriptionGrpcClient.ValidateFeatureAccess(
            new ValidateFeatureAccessRequest 
            { 
                UserId = GetCurrentUserId(), 
                FeatureType = "Search" 
            });
            
        if (!subscriptionCheck.HasAccess)
            return Forbid("Arama hakkınız bulunmamaktadır.");
            
        // Arama yap
        var searchResults = await _searchService.SearchAsync(request.Keywords);
        
        // Arama geçmişine kaydet
        await _searchHistoryService.SaveSearchAsync(GetCurrentUserId(), request, searchResults);
        
        // Kullanımı kaydet
        await _subscriptionGrpcClient.ConsumeFeature(new ConsumeFeatureRequest 
        { 
            UserId = GetCurrentUserId(), 
            FeatureType = "Search" 
        });
        
        return Ok(searchResults);
    }
    
    [HttpGet("history")]
    public async Task<ActionResult<List<SearchHistoryDto>>> GetSearchHistory()
    {
        var history = await _searchHistoryService.GetUserSearchHistoryAsync(GetCurrentUserId());
        return Ok(history);
    }
    
    [HttpPost("save-decision")]
    public async Task<ActionResult> SaveDecision([FromBody] SaveDecisionRequest request)
    {
        await _searchHistoryService.SaveDecisionAsync(GetCurrentUserId(), request.DecisionId);
        return Ok();
    }
}
```

## ApiGateway Konfigürasyonu

### Ocelot Configuration
```json
{
  "Routes": [
    {
      "DownstreamPathTemplate": "/api/auth/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        {
          "Host": "identityservice",
          "Port": 80
        }
      ],
      "UpstreamPathTemplate": "/api/auth/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST", "PUT", "DELETE" ]
    },
    {
      "DownstreamPathTemplate": "/api/subscription/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        {
          "Host": "subscriptionservice",
          "Port": 80
        }
      ],
      "UpstreamPathTemplate": "/api/subscription/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST", "PUT", "DELETE" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      }
    },
    {
      "DownstreamPathTemplate": "/api/gemini/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        {
          "Host": "aiservice",
          "Port": 80
        }
      ],
      "UpstreamPathTemplate": "/api/ai/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      }
    },
    {
      "DownstreamPathTemplate": "/api/search/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        {
          "Host": "searchservice",
          "Port": 80
        }
      ],
      "UpstreamPathTemplate": "/api/search/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      }
    },
    {
      "DownstreamPathTemplate": "/api/petition/{everything}",
      "DownstreamScheme": "http",
      "DownstreamHostAndPorts": [
        {
          "Host": "documentservice",
          "Port": 80
        }
      ],
      "UpstreamPathTemplate": "/api/petition/{everything}",
      "UpstreamHttpMethod": [ "GET", "POST" ],
      "AuthenticationOptions": {
        "AuthenticationProviderKey": "Bearer"
      }
    }
  ],
  "GlobalConfiguration": {
    "BaseUrl": "http://localhost:5000"
  }
}
```

## Yeni Proto Tanımları

### subscription.proto Güncellemeleri
```protobuf
syntax = "proto3";

option csharp_namespace = "Subscriptions";

package subscriptions;

service Subscription {
  rpc CheckSubscriptionStatus (CheckStatusRequest) returns (CheckStatusResponse);
  rpc ConsumeFeature (ConsumeFeatureRequest) returns (ConsumeFeatureResponse);
  rpc GetRemainingCredits (GetRemainingCreditsRequest) returns (GetRemainingCreditsResponse);
  rpc ValidateFeatureAccess (ValidateFeatureAccessRequest) returns (ValidateFeatureAccessResponse);
  rpc AssignTrialSubscription (AssignTrialRequest) returns (AssignTrialResponse);
}

message ConsumeFeatureRequest {
  string user_id = 1;
  string feature_type = 2;
}

message ConsumeFeatureResponse {
  bool success = 1;
  string message = 2;
  int32 remaining_count = 3;
}

message ValidateFeatureAccessRequest {
  string user_id = 1;
  string feature_type = 2;
}

message ValidateFeatureAccessResponse {
  bool has_access = 1;
  string message = 2;
  int32 remaining_count = 3;
}

message GetRemainingCreditsRequest {
  string user_id = 1;
}

message GetRemainingCreditsResponse {
  int32 keyword_extraction = 1;
  int32 case_analysis = 2;
  int32 search = 3;
  int32 petition = 4;
}

message AssignTrialRequest {
  string user_id = 1;
}

message AssignTrialResponse {
  bool success = 1;
  string message = 2;
}
```

## Docker Compose Güncellemeleri

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: yargisalzeka
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  identityservice:
    build: ./IdentityService
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=yargisalzeka_identity;Username=postgres;Password=password
      - Jwt__Key=your-super-secret-jwt-key-here
      - Jwt__Issuer=YargisalZeka
      - Jwt__Audience=YargisalZeka
    depends_on:
      - postgres
    ports:
      - "5001:80"

  subscriptionservice:
    build: ./SubscriptionService
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=yargisalzeka_subscription;Username=postgres;Password=password
    depends_on:
      - postgres
    ports:
      - "5002:80"

  aiservice:
    build: ./AIService
    environment:
      - GrpcServices__SubscriptionUrl=http://subscriptionservice:80
      - Gemini__ApiKey=your-gemini-api-key
    depends_on:
      - subscriptionservice
    ports:
      - "5003:80"

  searchservice:
    build: ./SearchService
    environment:
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=yargisalzeka_search;Username=postgres;Password=password
      - OpenSearch__Url=http://opensearch:9200
      - GrpcServices__SubscriptionUrl=http://subscriptionservice:80
    depends_on:
      - postgres
      - opensearch
      - subscriptionservice
    ports:
      - "5004:80"

  documentservice:
    build: ./DocumentService
    environment:
      - GrpcServices__SubscriptionUrl=http://subscriptionservice:80
    depends_on:
      - subscriptionservice
    ports:
      - "5005:80"

  apigateway:
    build: ./ApiGateway
    environment:
      - Jwt__Key=your-super-secret-jwt-key-here
      - Jwt__Issuer=YargisalZeka
      - Jwt__Audience=YargisalZeka
    depends_on:
      - identityservice
      - subscriptionservice
      - aiservice
      - searchservice
      - documentservice
    ports:
      - "5000:80"

  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - discovery.type=single-node
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
    volumes:
      - opensearch_data:/usr/share/opensearch/data

volumes:
  postgres_data:
  opensearch_data:
```

## Geliştirme Sırası ve Öncelikler

### Faz 1: Temel Abonelik Sistemi
1. SubscriptionService entity modelleri
2. Database migration'ları
3. Temel CRUD operasyonları
4. gRPC servis implementasyonu

### Faz 2: Kullanıcı Yönetimi Entegrasyonu
1. IdentityService güncellemeleri
2. Trial abonelik otomatik ataması
3. JWT token yönetimi
4. Kullanıcı profil endpointleri

### Faz 3: AI Servis Entegrasyonları
1. CaseAnalysisController implementasyonu
2. GeminiService genişletmeleri
3. Abonelik kontrolü entegrasyonu
4. Kullanım takibi

### Faz 4: Arama ve Belge Servisleri
1. SearchService güncellemeleri
2. Arama geçmişi sistemi
3. DocumentService dilekçe oluşturma
4. Karar kaydetme sistemi

### Faz 5: API Gateway ve Orchestration
1. Ocelot konfigürasyonu
2. Authentication middleware
3. Rate limiting
4. Error handling

### Faz 6: Testing ve Deployment
1. Unit testler
2. Integration testler
3. Docker compose konfigürasyonu
4. CI/CD pipeline

