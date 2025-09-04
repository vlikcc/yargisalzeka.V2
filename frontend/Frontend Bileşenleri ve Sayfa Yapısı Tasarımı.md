# Frontend Bileşenleri ve Sayfa Yapısı Tasarımı

## Genel Tasarım Prensipleri

### Renk Paleti
```css
:root {
  /* Primary Colors - Hukuk temasına uygun */
  --primary-900: #1e3a8a; /* Koyu mavi - Ana renk */
  --primary-800: #1e40af;
  --primary-700: #1d4ed8;
  --primary-600: #2563eb;
  --primary-500: #3b82f6;
  --primary-400: #60a5fa;
  --primary-300: #93c5fd;
  --primary-200: #bfdbfe;
  --primary-100: #dbeafe;
  --primary-50: #eff6ff;

  /* Secondary Colors - Altın tonları */
  --secondary-900: #92400e;
  --secondary-800: #a16207;
  --secondary-700: #b45309;
  --secondary-600: #d97706;
  --secondary-500: #f59e0b;
  --secondary-400: #fbbf24;
  --secondary-300: #fcd34d;
  --secondary-200: #fde68a;
  --secondary-100: #fef3c7;
  --secondary-50: #fffbeb;

  /* Neutral Colors */
  --gray-900: #111827;
  --gray-800: #1f2937;
  --gray-700: #374151;
  --gray-600: #4b5563;
  --gray-500: #6b7280;
  --gray-400: #9ca3af;
  --gray-300: #d1d5db;
  --gray-200: #e5e7eb;
  --gray-100: #f3f4f6;
  --gray-50: #f9fafb;

  /* Status Colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Typography
```css
/* Font Families */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-heading: 'Poppins', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
```

### Spacing System
```css
/* Spacing Scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

## Layout Bileşenleri

### AppLayout Component
```tsx
interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showSidebar = true, 
  sidebarCollapsed = false 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {showSidebar && (
          <Sidebar collapsed={sidebarCollapsed} />
        )}
        <main className={`flex-1 ${showSidebar ? 'ml-64' : ''}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};
```

### Header Component
```tsx
const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentPlan, remainingCredits } = useSubscription();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Scale className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              Yargısal Zeka
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <NavLink to="/dashboard" className="nav-link">
              Dashboard
            </NavLink>
            <NavLink to="/search" className="nav-link">
              Arama
            </NavLink>
            <NavLink to="/history" className="nav-link">
              Geçmiş
            </NavLink>
            <NavLink to="/subscription" className="nav-link">
              Abonelik
            </NavLink>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Credits Display */}
            <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600">
              <CreditCard className="h-4 w-4" />
              <span>{currentPlan?.name}</span>
              <span className="text-gray-400">|</span>
              <span>{remainingCredits?.search} arama</span>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback>
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Ayarlar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
```

### Sidebar Component
```tsx
interface SidebarProps {
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  
  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/dashboard',
      badge: null
    },
    {
      icon: Search,
      label: 'Arama Yap',
      path: '/search',
      badge: null
    },
    {
      icon: History,
      label: 'Geçmiş Aramalar',
      path: '/history',
      badge: null
    },
    {
      icon: BookOpen,
      label: 'Kaydedilen Kararlar',
      path: '/saved-decisions',
      badge: null
    },
    {
      icon: FileText,
      label: 'Dilekçelerim',
      path: '/petitions',
      badge: null
    },
    {
      icon: CreditCard,
      label: 'Abonelik',
      path: '/subscription',
      badge: 'Premium'
    },
    {
      icon: BarChart3,
      label: 'İstatistikler',
      path: '/analytics',
      badge: null
    }
  ];

  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="ml-3">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
```

## Sayfa Bileşenleri

### LoginPage Component
```tsx
const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo ve Başlık */}
        <div className="text-center">
          <Scale className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Hesabınıza Giriş Yapın
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Yargısal Zeka platformuna hoş geldiniz
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta Adresi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="ornek@email.com"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                    Beni hatırla
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Şifremi unuttum
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Giriş Yap
              </Button>
            </form>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Hesabınız yok mu?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center py-2 px-4 border border-primary-300 rounded-md shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 transition-colors"
              >
                Yeni Hesap Oluştur
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
```

### RegisterPage Component
```tsx
const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    }
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await register(data);
      toast.success('Kayıt başarılı! 3 günlük trial aboneliğiniz aktif edildi.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo ve Başlık */}
        <div className="text-center">
          <Scale className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Hesap Oluşturun
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            3 günlük ücretsiz trial ile başlayın
          </p>
        </div>

        {/* Register Form */}
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Adınız" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Soyad</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Soyadınız" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta Adresi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="ornek@email.com"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre Tekrar</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        <Link to="/terms" className="text-primary-600 hover:underline">
                          Kullanım Şartları
                        </Link>{' '}
                        ve{' '}
                        <Link to="/privacy" className="text-primary-600 hover:underline">
                          Gizlilik Politikası
                        </Link>
                        'nı kabul ediyorum
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hesap Oluştur
              </Button>
            </form>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Zaten hesabınız var mı?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-primary-300 rounded-md shadow-sm text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 transition-colors"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
```

### DashboardPage Component
```tsx
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { currentPlan, remainingCredits, usageStats } = useSubscription();
  const { recentSearches } = useSearch();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">
            Hoş geldiniz, {user?.firstName}!
          </h1>
          <p className="mt-2 text-primary-100">
            Yargısal Zeka platformunda hukuki araştırmalarınızı kolaylaştırın
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Kalan Arama"
            value={remainingCredits?.search || 0}
            icon={Search}
            color="blue"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Olay Analizi"
            value={remainingCredits?.caseAnalysis || 0}
            icon={FileText}
            color="green"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Dilekçe Hakkı"
            value={remainingCredits?.petition || 0}
            icon={Edit}
            color="purple"
            trend={{ value: 3, isPositive: false }}
          />
          <StatsCard
            title="Bu Ay Toplam"
            value={usageStats?.totalThisMonth || 0}
            icon={BarChart3}
            color="orange"
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Hızlı İşlemler</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickActionCard
                  title="Yeni Arama"
                  description="Hukuki olay analizi ve karar arama"
                  icon={Search}
                  href="/search"
                  color="blue"
                />
                <QuickActionCard
                  title="Geçmiş Aramalar"
                  description="Önceki aramalarınızı görüntüleyin"
                  icon={History}
                  href="/history"
                  color="green"
                />
                <QuickActionCard
                  title="Dilekçe Oluştur"
                  description="AI destekli dilekçe hazırlama"
                  icon={FileText}
                  href="/petitions/new"
                  color="purple"
                />
                <QuickActionCard
                  title="Abonelik Yönetimi"
                  description="Paketinizi yükseltin veya yönetin"
                  icon={CreditCard}
                  href="/subscription"
                  color="orange"
                />
              </div>
            </Card>
          </div>

          {/* Subscription Info */}
          <div className="space-y-6">
            <SubscriptionCard currentPlan={currentPlan} />
            <UsageChart data={usageStats?.dailyUsage || []} />
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Son Aktiviteler</h3>
            <Link
              to="/history"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Tümünü Gör
            </Link>
          </div>
          <RecentActivityList activities={recentSearches} />
        </Card>
      </div>
    </AppLayout>
  );
};
```

### SearchPage Component
```tsx
const SearchPage: React.FC = () => {
  const [caseText, setCaseText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const { remainingCredits } = useSubscription();
  const { searchCases } = useSearch();

  const handleSearch = async () => {
    if (!caseText.trim()) {
      toast.error('Lütfen olay metnini girin');
      return;
    }

    if (remainingCredits?.search === 0) {
      toast.error('Arama hakkınız bulunmamaktadır');
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await searchCases(caseText);
      setSearchResults(results);
      toast.success('Analiz tamamlandı');
    } catch (error) {
      toast.error('Analiz sırasında bir hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Hukuki Olay Analizi
          </h1>
          <p className="mt-2 text-gray-600">
            Olayınızı anlatın, size en uygun kararları bulalım
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="caseText" className="text-base font-medium">
                Olay Metni
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Hukuki olayınızı detaylı bir şekilde anlatın. Ne kadar detay verirseniz, 
                o kadar doğru sonuçlar alırsınız.
              </p>
              <Textarea
                id="caseText"
                value={caseText}
                onChange={(e) => setCaseText(e.target.value)}
                placeholder="Örnek: Müvekkilim A şirketi, B şirketi ile 15.03.2023 tarihinde bir hizmet sözleşmesi imzalamıştır. Sözleşme gereği B şirketi, belirtilen süre içinde hizmeti tamamlayacaktı ancak..."
                className="min-h-[200px] resize-none"
                maxLength={5000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {caseText.length}/5000 karakter
                </span>
                <span className="text-sm text-gray-500">
                  Kalan arama hakkı: {remainingCredits?.search || 0}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={isAnalyzing || !caseText.trim() || remainingCredits?.search === 0}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analiz Et ve Ara
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            {/* Case Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Brain className="mr-2 h-5 w-5 text-primary-600" />
                Olay Analizi
              </h3>
              <CaseAnalysisDisplay analysis={searchResults.analysis} />
            </Card>

            {/* Keywords */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Tag className="mr-2 h-5 w-5 text-secondary-600" />
                Çıkarılan Anahtar Kelimeler
              </h3>
              <KeywordsList keywords={searchResults.keywords} />
            </Card>

            {/* Decisions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Scale className="mr-2 h-5 w-5 text-green-600" />
                En Uygun Kararlar
              </h3>
              <DecisionsList 
                decisions={searchResults.decisions} 
                onSaveDecision={(decisionId) => {
                  // Save decision logic
                }}
              />
            </Card>

            {/* Petition Generation */}
            {remainingCredits?.petition > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-purple-600" />
                  Dilekçe Oluşturma
                </h3>
                <PetitionGenerator 
                  caseData={searchResults}
                  onGenerate={(petition) => {
                    // Generate petition logic
                  }}
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
```

## Feature Bileşenleri

### SubscriptionCard Component
```tsx
interface SubscriptionCardProps {
  currentPlan: SubscriptionPlan;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ currentPlan }) => {
  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'trial': return 'gray';
      case 'temel': return 'blue';
      case 'standart': return 'green';
      case 'premium': return 'purple';
      default: return 'gray';
    }
  };

  const color = getPlanColor(currentPlan.name);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mevcut Paket</h3>
        <Badge variant={color as any} className="text-xs">
          {currentPlan.name}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Aylık Ücret</span>
          <span className="font-medium">
            {currentPlan.price === 0 ? 'Ücretsiz' : `₺${currentPlan.price}`}
          </span>
        </div>

        {currentPlan.validityDays && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Kalan Süre</span>
            <span className="font-medium text-orange-600">
              {currentPlan.validityDays} gün
            </span>
          </div>
        )}

        <div className="pt-3 border-t">
          <Link
            to="/subscription"
            className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Paketi Yönet
          </Link>
        </div>
      </div>
    </Card>
  );
};
```

### DecisionCard Component
```tsx
interface DecisionCardProps {
  decision: ScoredDecision;
  onSave: (decisionId: string) => void;
  onView: (decisionId: string) => void;
}

const DecisionCard: React.FC<DecisionCardProps> = ({ 
  decision, 
  onSave, 
  onView 
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave(decision.decision.id);
    setIsSaved(true);
    toast.success('Karar kaydedildi');
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {decision.decision.court}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {decision.decision.date}
            </Badge>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium ml-1">
                {decision.score}/100
              </span>
            </div>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">
            {decision.decision.title}
          </h4>
          <p className="text-sm text-gray-600 line-clamp-3">
            {decision.decision.summary}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <FileText className="h-4 w-4" />
          <span>Karar No: {decision.decision.number}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(decision.decision.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Görüntüle
          </Button>
          <Button
            variant={isSaved ? "secondary" : "default"}
            size="sm"
            onClick={handleSave}
            disabled={isSaved}
          >
            <Bookmark className={`h-4 w-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Kaydedildi' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
```

### UsageChart Component
```tsx
interface UsageChartProps {
  data: DailyUsage[];
}

const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Günlük Kullanım</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('tr-TR')}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString('tr-TR')}
            />
            <Line 
              type="monotone" 
              dataKey="searches" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Arama"
            />
            <Line 
              type="monotone" 
              dataKey="analyses" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Analiz"
            />
            <Line 
              type="monotone" 
              dataKey="petitions" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Dilekçe"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
```

## Responsive Tasarım Stratejisi

### Mobile-First Approach
```css
/* Base styles (mobile) */
.container {
  padding: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
  }
  
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 2rem;
  }
  
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
}
```

### Touch-Friendly Interface
```css
/* Minimum touch target size */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Increased spacing on mobile */
@media (max-width: 767px) {
  .button-group {
    gap: 0.75rem;
  }
  
  .form-field {
    margin-bottom: 1.5rem;
  }
}
```

## Animation ve Micro-interactions

### Loading States
```tsx
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

const SkeletonCard: React.FC = () => (
  <Card className="p-6">
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  </Card>
);
```

### Hover Effects
```css
.card-hover {
  transition: all 0.2s ease-in-out;
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.button-hover {
  transition: all 0.2s ease-in-out;
}

.button-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
```

### Page Transitions
```tsx
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);
```

## Accessibility (A11y) Özellikleri

### Semantic HTML
```tsx
const AccessibleForm: React.FC = () => (
  <form role="form" aria-labelledby="form-title">
    <h2 id="form-title">Olay Analizi Formu</h2>
    
    <fieldset>
      <legend>Olay Bilgileri</legend>
      
      <label htmlFor="case-text">
        Olay Metni
        <span aria-label="zorunlu alan" className="text-red-500">*</span>
      </label>
      <textarea
        id="case-text"
        aria-describedby="case-text-help"
        aria-required="true"
        placeholder="Olayınızı detaylı bir şekilde anlatın"
      />
      <div id="case-text-help" className="text-sm text-gray-500">
        Ne kadar detay verirseniz, o kadar doğru sonuçlar alırsınız.
      </div>
    </fieldset>
    
    <button type="submit" aria-describedby="submit-help">
      Analiz Et
    </button>
    <div id="submit-help" className="sr-only">
      Bu işlem birkaç dakika sürebilir
    </div>
  </form>
);
```

### Keyboard Navigation
```css
/* Focus styles */
.focus-visible:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

### Screen Reader Support
```tsx
const ScreenReaderText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

const AccessibleButton: React.FC = () => (
  <button aria-label="Arama sonuçlarını kaydet">
    <Bookmark className="h-4 w-4" />
    <ScreenReaderText>Kaydet</ScreenReaderText>
  </button>
);
```

