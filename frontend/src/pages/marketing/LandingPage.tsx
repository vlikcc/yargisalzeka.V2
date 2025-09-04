import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, FileText, BarChart3, Shield, ArrowRight, CheckCircle, Star, Users, Zap, Scale, Loader2, AlertCircle } from 'lucide-react';
import { ENDPOINTS } from '../../config/api';
import { API_CONFIG } from '../../config/api';

// Types for API responses
interface SubscriptionPlanDto {
  id: number;
  name: string;
  price: number;
  validityDays: number | null;
  keywordExtractionLimit: number;
  caseAnalysisLimit: number;
  searchLimit: number;
  petitionLimit: number;
}

interface Plan {
  id: number;
  name: string;
  price: string;
  period: string | null;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}

export default function LandingPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.user) {
      navigate('/app');
    }
  }, [state.user, navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.SUBSCRIPTION.PLANS}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

  const data: SubscriptionPlanDto[] = await response.json();

  // Hide Trial from landing pricing
  const visible = data.filter(p => p.name.toLowerCase() !== 'trial');

  // Transform API data to frontend format
  const transformedPlans: Plan[] = visible.map((plan, index) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price === 0 ? '₺0' : `₺${plan.price}`,
          period: plan.validityDays ? 'günlük' : 'aylık',
          description: getPlanDescription(plan.name),
          features: getPlanFeatures(plan),
          buttonText: getPlanButtonText(plan.name),
          popular: plan.name.toLowerCase().includes('standart') // Make "Standart" plan popular by default
        }));

        setPlans(transformedPlans);
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
        setError('Paket bilgileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');

        // Fallback to static data if API fails
        setPlans(getFallbackPlans());
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-accent-50/20">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 backdrop-blur-md border-b border-neutral-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-neutral-900">Yargısal Zeka</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-neutral-600 hover:text-primary-600 transition-colors duration-200">Özellikler</a>
              <a href="#pricing" className="text-neutral-600 hover:text-primary-600 transition-colors duration-200">Paketler</a>
              <a href="#faq" className="text-neutral-600 hover:text-primary-600 transition-colors duration-200">SSS</a>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/login" className="btn-secondary">
                Giriş Yap
              </Link>
              <Link to="/register" className="btn-primary">
                Ücretsiz Başla
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Yapay Zeka Destekli Hukuk Platformu
            </div>

            <h1 className="hero-title text-4xl md:text-6xl lg:text-7xl font-bold text-neutral-900 mb-6 leading-snug md:leading-[1.2] lg:leading-[1.15] tracking-tight antialiased overflow-visible">
              <span className="line">Yargı Kararlarından</span>
              <span className="line bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                Akıllı İçgörüler
              </span>
            </h1>

            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Binlerce yargı kararını saniyeler içinde ara, analiz et ve dilekçe taslakları oluştur.
              Modern hukuk teknolojisi ile zamanınızı geri kazanın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/register" className="btn-primary text-lg px-8 py-4">
                <span>Ücretsiz Başla</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <a href="#features" className="btn-secondary text-lg px-8 py-4">
                Özellikleri Keşfet
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">10M+</div>
                <div className="text-neutral-600">Yargı Kararı</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">50K+</div>
                <div className="text-neutral-600">Aktif Kullanıcı</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">99.9%</div>
                <div className="text-neutral-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">24/7</div>
                <div className="text-neutral-600">Destek</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Güçlü Özellikler
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Hukuk profesyonelleri için tasarlanmış yapay zeka destekli araçlar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div key={feature.title} className="card p-8 group">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-200 transition-colors duration-200">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">{feature.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 lg:py-32 bg-neutral-100/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Basit ve Şeffaf Fiyatlandırma
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              İhtiyacınıza göre paket seçin, istediğiniz zaman yükseltebilirsiniz
            </p>
          </div>

          {error && (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                {error}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Sayfayı Yenile
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-8 animate-pulse">
                  <div className="h-6 bg-neutral-200 rounded mb-4"></div>
                  <div className="h-8 bg-neutral-200 rounded mb-6"></div>
                  <div className="space-y-3 mb-8">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-neutral-200 rounded"></div>
                    ))}
                  </div>
                  <div className="h-10 bg-neutral-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <div key={plan.id} className={`card p-8 relative flex flex-col h-full ${plan.popular ? 'ring-2 ring-primary-500 shadow-large' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      En Popüler
                    </span>
                  </div>
                )}

                <div className="text-center mb-8 flex-shrink-0">
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">{plan.name}</h3>
                  <p className="text-neutral-600 mb-6 min-h-[3rem] flex items-center justify-center">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                    {plan.period && <span className="text-neutral-600 ml-2">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Link
                    to="/register"
                    className={`w-full py-3 px-6 rounded-lg font-medium text-center transition-all duration-200 block ${
                      plan.popular
                        ? 'btn-primary'
                        : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 hover:shadow-soft'
                    }`}
                  >
                    {plan.buttonText}
                  </Link>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Sık Sorulan Sorular
            </h2>
            <p className="text-xl text-neutral-600">
              Merak ettiğiniz soruların cevaplarını burada bulabilirsiniz
            </p>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, index) => (
              <details key={index} className="card p-6">
                <summary className="cursor-pointer font-semibold text-lg text-neutral-900 flex items-center justify-between">
                  {item.question}
                  <ArrowRight className="w-5 h-5 text-neutral-400 transition-transform duration-200 details[open] & rotate-90" />
                </summary>
                <p className="pt-4 text-neutral-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-primary-600">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Hukuk Pratiğinizi Modernleştirin
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Ücretsiz hesap oluşturun ve yapay zeka destekli hukuk araştırmalarınızın gücünü keşfedin.
          </p>
          <Link to="/register" className="btn bg-white text-primary-600 hover:bg-neutral-50 text-lg px-8 py-4">
            Ücretsiz Başla
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-300 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-white">Yargısal Zeka</span>
              </div>
              <p className="text-neutral-400 max-w-md">
                Yapay zeka destekli hukuk platformu ile yargı kararlarını analiz edin,
                dilekçe taslakları oluşturun ve hukuk araştırmalarınızı hızlandırın.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Özellikler</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Paketler</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">SSS</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Destek</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition-colors">Giriş Yap</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Kayıt Ol</Link></li>
                <li><a href="mailto:support@yargisalzeka.com" className="hover:text-white transition-colors">İletişim</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-8 text-center">
            <p className="text-neutral-400">
              © {new Date().getFullYear()} Yargısal Zeka. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Akıllı Arama',
    description: 'Yüksek hacimli yargı kararları üzerinde hızlı ve isabetli arama. Gelişmiş filtreleme seçenekleri ile tam olarak aradığınızı bulun.',
    icon: Search
  },
  {
    title: 'Derinlemesine Analiz',
    description: 'Yapay zeka ile otomatik özet, anahtar kavram çıkarımı, benzer karar önerileri ve detaylı içgörü üretimi.',
    icon: BarChart3
  },
  {
    title: 'Dilekçe Taslağı',
    description: 'Girdiğiniz bilgiler ve analiz sonuçlarından otomatik olarak profesyonel dilekçe taslakları oluşturun.',
    icon: FileText
  },
  {
    title: 'Güvenli & Ölçeklenebilir',
    description: 'JWT tabanlı yetkilendirme, end-to-end şifreleme ve güvenli veri akışı ile bilgileriniz her zaman korunur.',
    icon: Shield
  },
  {
    title: 'Akıllı Öneriler',
    description: 'Kullanım geçmişinize ve tercihlerinize göre kişiselleştirilmiş arama önerileri ve analiz sonuçları.',
    icon: Zap
  },
  {
    title: 'Takım Çalışması',
    description: 'Ekip üyelerinizle kararları paylaşın, yorumlayın ve birlikte daha etkili çalışın.',
    icon: Users
  }
];

// Helper functions for plan data transformation
const getPlanDescription = (planName: string): string => {
  const descriptions: Record<string, string> = {
    'Trial': '3 gün boyunca tüm özellikleri deneyin',
    'Temel': 'Temel hukuk araştırmaları için',
    'Standart': 'Yoğun kullanım için ideal',
    'Premium': 'Sınırsız kullanım ve tüm özellikler'
  };
  return descriptions[planName] || 'Hukuk araştırmaları için';
};

const getPlanFeatures = (plan: SubscriptionPlanDto): string[] => {
  const features: string[] = [];

  // Anahtar Kelime Çıkarma
  if (plan.keywordExtractionLimit < 0) {
    features.push('Anahtar Kelime Çıkarma (Sınırsız)');
  } else {
    features.push(`Anahtar Kelime Çıkarma (${plan.keywordExtractionLimit} Adet)`);
  }

  // Olay Analizi
  if (plan.caseAnalysisLimit < 0) {
    features.push('Olay Analizi (Sınırsız)');
  } else {
    features.push(`Olay Analizi (${plan.caseAnalysisLimit} Adet)`);
  }

  // Arama Yapma
  if (plan.searchLimit < 0) {
    features.push('Arama Yapma (Sınırsız)');
  } else {
    features.push(`Arama Yapma (${plan.searchLimit} Adet)`);
  }

  // Dilekçe Hazırlama
  if (plan.petitionLimit < 0) {
    features.push('Dilekçe Hazırlama (Sınırsız)');
  } else if (plan.petitionLimit > 0) {
    features.push(`Dilekçe Hazırlama (${plan.petitionLimit} Adet)`);
  }

  // Additional features based on plan
  if (plan.name.toLowerCase().includes('premium')) {
    features.push('7/24 öncelikli destek');
    features.push('Gelişmiş AI analiz');
    features.push('API erişimi');
    features.push('Özel eğitim');
    features.push('Takım yönetimi');
  } else if (plan.name.toLowerCase().includes('standart')) {
    features.push('Öncelikli destek');
    features.push('PDF dışa aktarma');
  } else if (plan.name.toLowerCase().includes('trial')) {
    features.push('Geçerlilik süresi: 3 gün');
    features.push('E-posta desteği');
  } else {
    features.push('E-posta desteği');
  }

  return features;
};

const getPlanButtonText = (planName: string): string => {
  const buttonTexts: Record<string, string> = {
    'Trial': 'Ücretsiz Dene',
    'Temel': 'Temel Başla',
    'Standart': 'Standart Başla',
    'Premium': 'Premium Başla'
  };
  return buttonTexts[planName] || 'Başla';
};

// Fallback plans for when API is unavailable
const getFallbackPlans = (): Plan[] => [
  {
    id: 1,
    name: 'Temel Paket',
    price: '₺199',
    period: 'aylık',
    description: 'Temel hukuk araştırmaları için',
    features: [
      'Anahtar Kelime Çıkarma (Sınırsız)',
      'Olay Analizi (5 Adet)',
      'Arama Yapma (5 Adet)',
      'E-posta desteği'
    ],
    buttonText: 'Temel Başla',
    popular: false
  },
  {
    id: 2,
    name: 'Standart Paket',
    price: '₺499',
    period: 'aylık',
    description: 'Yoğun kullanım için ideal',
    features: [
      'Anahtar Kelime Çıkarma (Sınırsız)',
      'Olay Analizi (50 Adet)',
      'Arama Yapma (250 Adet)',
      'Dilekçe Hazırlama (10 Adet)',
      'Öncelikli destek',
      'PDF dışa aktarma'
    ],
    buttonText: 'Standart Başla',
    popular: true
  },
  {
    id: 3,
    name: 'Premium Paket',
    price: '₺999',
    period: 'aylık',
    description: 'Sınırsız kullanım ve tüm özellikler',
    features: [
      'Tüm Özellikler Sınırsız',
      '7/24 öncelikli destek',
      'Gelişmiş AI analiz',
      'API erişimi',
      'Özel eğitim',
      'Takım yönetimi'
    ],
    buttonText: 'Premium Başla',
    popular: false
  }
];

const FAQ = [
  {
    question: 'Platform nasıl çalışır?',
    answer: 'Kayıt olduktan sonra arama yapabilir, kararları analiz edebilir ve dilekçe taslakları oluşturabilirsiniz. Her işlem kotanız dahilinde yapılır.'
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'Evet, tüm veriler end-to-end şifrelenir, güvenli sunucularda saklanır ve GDPR uyumludur. Sadece siz verilerinize erişebilirsiniz.'
  },
  {
    question: 'Ücretsiz deneme imkanı var mı?',
    answer: 'Evet, sisteme kayıt olduktan sonra tüm kullanıcılara otomatik olarak 3 günlük ücretsiz deneme paketi tanımlanıyor. Bu süre boyunca temel özellikleri deneyebilirsiniz.'
  },
  {
    question: 'Dilekçe taslakları ne kadar doğru?',
    answer: 'AI tarafından oluşturulan taslaklar genel bir çerçeve sağlar. Her zaman bir hukuk uzmanı tarafından gözden geçirilmesi önerilir.'
  },
  {
    question: 'Planımı istediğim zaman değiştirebilir miyim?',
    answer: 'Evet, planınızı istediğiniz zaman yükseltebilir veya düşürebilirsiniz. Değişiklikler anında aktif olur.'
  },
  {
    question: 'Teknik destek alıyor muyum?',
    answer: 'Evet, tüm planlarda teknik destek sunulur. Profesyonel ve Kurumsal planlarda öncelikli destek mevcuttur.'
  }
];
