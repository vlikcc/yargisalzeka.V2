import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, FileText, BarChart3, Shield, ArrowRight, Check, ChevronDown, Zap } from 'lucide-react';
import { ENDPOINTS, API_CONFIG } from '../../config/api';

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
  popular: boolean;
}

export default function LandingPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (state.user) {
      navigate('/app');
    }
  }, [state.user, navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.SUBSCRIPTION.PLANS}`);
        if (response.ok) {
          const data: SubscriptionPlanDto[] = await response.json();
          const visible = data.filter(p => p.name.toLowerCase() !== 'trial');
          setPlans(visible.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: plan.price === 0 ? '₺0' : `₺${plan.price}`,
            period: plan.validityDays ? `${plan.validityDays} gün` : '/ay',
            description: getDescription(plan.name),
            features: getFeatures(plan),
            popular: plan.name.toLowerCase().includes('standart')
          })));
        } else {
          setPlans(fallbackPlans);
        }
      } catch {
        setPlans(fallbackPlans);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 selection:bg-cyan-500/30 bg-slate-900">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="relative w-10 h-10 group">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-300"></div>
                <img
                  src="/images/logo-symbol.png"
                  alt="Yargısal Zeka Logo"
                  className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  width="40"
                  height="40"
                />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-slate-400">
                Yargısal Zeka
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#ozellikler" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-105 transition-all duration-200">Özellikler</a>
              <a href="#fiyatlar" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-105 transition-all duration-200">Fiyatlandırma</a>
              <a href="#sss" className="text-sm font-medium text-slate-300 hover:text-white hover:scale-105 transition-all duration-200">SSS</a>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm font-medium transition-all duration-300 backdrop-blur-sm"
              >
                Giriş Yap
              </button>
              <button
                onClick={() => navigate('/register')}
                className="group relative px-6 py-2.5 rounded-full overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-violet-600 transition-transform duration-300 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative text-white text-sm font-medium">Ücretsiz Dene</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                {/* Assuming Menu icon is imported or defined elsewhere, adding a placeholder */}
                {/* <Menu className="w-6 h-6" /> */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 select-none">
          <img
            src="/images/hero-bg.jpg"
            alt="Background"
            className="w-full h-full object-cover opacity-20 scale-105 animate-pulse-slow"
            width="1920"
            height="1080"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-slate-900"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-900/0 to-slate-900/0"></div>
        </div>
        <div className="container-app relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-sm font-medium text-cyan-300">Yapay Zeka Destekli Hukuk Platformu</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Yargı Kararlarını <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 animate-gradient-x">
              Akıllıca Araştırın
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Binlerce yargı kararını saniyeler içinde tarayın, yapay zeka ile analiz edin ve profesyonel dilekçe taslakları oluşturun. Hukuk pratiğinizi geleceğe taşıyın.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="h-14 px-8 text-lg inline-flex items-center justify-center bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-semibold border-0 shadow-xl shadow-cyan-900/20 transition-all hover:scale-105 rounded-xl"
            >
              Ücretsiz Başlayın <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="#ozellikler"
              className="h-14 px-8 text-lg inline-flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-all rounded-xl"
            >
              Daha Fazla Bilgi
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 pt-12 border-t border-white/5 max-w-4xl mx-auto">
            {[
              { value: '10M+', label: 'Yargı Kararı' },
              { value: '50K+', label: 'Kullanıcı' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Destek' }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="ozellikler" className="py-24 relative">
        <div className="container-app">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Güçlü Özellikler</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Hukuk profesyonelleri için tasarlanmış, iş akışınızı hızlandıran modern araçlar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative overflow-hidden rounded-3xl glass border border-white/5 hover:border-cyan-500/30 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center relative z-10">
                  <div className="flex-1 text-center md:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto md:mx-0 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-7 h-7 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="fiyatlar" className="py-24 bg-slate-900/50">
        <div className="container-app">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Basit Fiyatlandırma</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              İhtiyacınıza en uygun planı seçin, hemen kullanmaya başlayın.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="glass rounded-3xl p-8 animate-pulse border border-white/5">
                  <div className="h-6 bg-slate-700 rounded mb-4 w-1/2"></div>
                  <div className="h-10 bg-slate-700 rounded mb-6"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-4 bg-slate-700 rounded"></div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              plans.map((plan, index) => (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-8 flex flex-col glass transition-all duration-300 ${plan.popular
                    ? 'border-cyan-500/50 shadow-2xl shadow-cyan-900/20 scale-105 z-10'
                    : 'border-white/5 hover:border-white/10'
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      EN POPÜLER
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-slate-400 h-10">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>

                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-cyan-400" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`w-full h-12 font-semibold rounded-xl inline-flex items-center justify-center transition-all ${plan.popular
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                      : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                  >
                    Planı Seç
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="sss" className="py-24">
        <div className="container-app max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sık Sorulan Sorular</h2>
          </div>

          <div className="space-y-4">
            {faq.map((item, index) => (
              <div key={index} className="rounded-2xl glass border border-white/5 overflow-hidden">
                <button
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-medium text-lg text-slate-200">{item.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <div
                  className={`px-6 text-slate-400 leading-relaxed overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 to-violet-900/20"></div>
        <div className="container-app relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Hukuk Araştırmalarınızı Hızlandırın
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Ücretsiz hesap oluşturun ve yapay zeka destekli platformun avantajlarından hemen yararlanmaya başlayın.
          </p>
          <Link
            to="/register"
            className="h-14 px-10 text-lg inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-xl hover:scale-105 transition-all rounded-xl"
          >
            Ücretsiz Başla <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950">
        <div className="container-app">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src="/images/logo-symbol.png" alt="Yargısal Zeka Logo" className="w-8 h-8 object-contain opacity-80" />
              <span className="text-lg font-bold text-slate-300">Yargısal Zeka</span>
            </div>
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Yargısal Zeka. Tüm hakları saklıdır.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-slate-500 hover:text-cyan-400 transition-colors">Gizlilik</a>
              <a href="#" className="text-slate-500 hover:text-cyan-400 transition-colors">Kullanım Şartları</a>
              <a href="#" className="text-slate-500 hover:text-cyan-400 transition-colors">İletişim</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: 'Akıllı Arama',
    description: 'Elasticsearch ile güçlendirilmiş, saniyeler içinde binlerce karar arasında nokta atışı arama.',
    icon: Search,
    image: '/images/feature-search.jpg'
  },
  {
    title: 'Yapay Zeka Analizi',
    description: 'Kararları otomatik analiz edin, özetleyin ve kritik noktaları anında tespit edin.',
    icon: Zap,
    image: '/images/feature-ai.jpg'
  },
  {
    title: 'Dilekçe Oluşturma',
    description: 'Analiz sonuçlarına dayalı, profesyonel ve hukuki standartlara uygun dilekçe taslakları.',
    icon: FileText,
    image: '/images/feature-ai.jpg'
  },
  {
    title: 'Güvenli Platform',
    description: 'Uçtan uca şifreleme ve KVKK uyumlu altyapı ile verileriniz her zaman güvende.',
    icon: Shield,
    image: '/images/feature-security.jpg'
  }
];

const faq = [
  {
    question: 'Platform nasıl çalışır?',
    answer: 'Yargısal Zeka, milyonlarca yargı kararını tarayarak doğal dil işleme (NLP) teknolojisi ile analiz eder. Siz sadece aradığınız konuyu yazarsınız, sistem en alakalı sonuçları ve özetleri sunar.'
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'Kesinlikle. Tüm verileriniz 256-bit SSL şifreleme ile korunur ve sunucularımızda güvenle saklanır. KVKK ve GDPR standartlarına tam uyumluyuz.'
  },
  {
    question: 'Ücretsiz deneme var mı?',
    answer: 'Evet, Başlangıç paketimiz tamamen ücretsizdir ve temel özellikleri denemeniz için tasarlanmıştır. Kredi kartı gerekmez.'
  },
  {
    question: 'Planımı değiştirebilir miyim?',
    answer: 'İstediğiniz zaman planınızı yükseltebilir veya düşürebilirsiniz. Değişiklikler anında hesabınıza yansıtılır.'
  }
];

const getDescription = (name: string): string => {
  const map: Record<string, string> = {
    'Temel': 'Bireysel kullanıcılar ve öğrenciler için ideal.',
    'Standart': 'Hukuk büroları ve aktif avukatlar için.',
    'Premium': 'Büyük ölçekli hukuk departmanları için.'
  };
  return map[name] || 'Hukuk araştırmaları için tasarlandı.';
};

const getFeatures = (plan: SubscriptionPlanDto): string[] => {
  const list: string[] = [];

  if (plan.keywordExtractionLimit < 0) list.push('Sınırsız anahtar kelime');
  else list.push(`${plan.keywordExtractionLimit} anahtar kelime`);

  if (plan.caseAnalysisLimit < 0) list.push('Gelişmiş AI Analizi');
  else list.push(`${plan.caseAnalysisLimit} olay analizi`);

  if (plan.searchLimit < 0) list.push('Sınırsız Arama');
  else list.push(`${plan.searchLimit} arama`);

  if (plan.petitionLimit < 0) list.push('Sınırsız Dilekçe');
  else if (plan.petitionLimit > 0) list.push(`${plan.petitionLimit} dilekçe`);

  // Add extra features for premium plans
  if (plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('standart')) {
    list.push('7/24 Öncelikli Destek');
  }

  return list;
};

const fallbackPlans: Plan[] = [
  {
    id: 1,
    name: 'Temel',
    price: '₺199',
    period: '/ay',
    description: 'Başlangıç için ideal',
    features: ['Sınırsız anahtar kelime', '5 olay analizi', '5 arama'],
    popular: false
  },
  {
    id: 2,
    name: 'Standart',
    price: '₺499',
    period: '/ay',
    description: 'Yoğun kullanım için',
    features: ['Sınırsız anahtar kelime', '50 olay analizi', '250 arama', '10 dilekçe'],
    popular: true
  },
  {
    id: 3,
    name: 'Premium',
    price: '₺999',
    period: '/ay',
    description: 'Profesyoneller için',
    features: ['Sınırsız anahtar kelime', 'Sınırsız analiz', 'Sınırsız arama', 'Sınırsız dilekçe'],
    popular: false
  }
];
