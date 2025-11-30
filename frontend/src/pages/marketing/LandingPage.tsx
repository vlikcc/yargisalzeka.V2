import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, FileText, BarChart3, Shield, ArrowRight, Check, Scale, ChevronDown } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="container-app">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Yargısal Zeka</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#ozellikler" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Özellikler</a>
              <a href="#fiyatlar" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Fiyatlar</a>
              <a href="#sss" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">SSS</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost">Giriş</Link>
              <Link to="/register" className="btn-primary">Ücretsiz Başla</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section pt-20 pb-24">
        <div className="container-app">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6">
              <Scale className="w-4 h-4" />
              Yapay Zeka Destekli Hukuk Platformu
            </div>

            <h1 className="heading-1 mb-6">
              Yargı Kararlarını<br />
              <span className="text-primary-700">Akıllıca Araştırın</span>
            </h1>

            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
              Binlerce yargı kararını saniyeler içinde arayın, yapay zeka ile analiz edin 
              ve profesyonel dilekçe taslakları oluşturun.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary btn-lg">
                Ücretsiz Başlayın
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <a href="#ozellikler" className="btn-secondary btn-lg">
                Daha Fazla Bilgi
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-12 border-t border-slate-100">
            {[
              { value: '10M+', label: 'Yargı Kararı' },
              { value: '50K+', label: 'Kullanıcı' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Destek' }
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary-800">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="ozellikler" className="section bg-slate-50">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Güçlü Özellikler</h2>
            <p className="text-body max-w-2xl mx-auto">
              Hukuk profesyonelleri için tasarlanmış modern araçlar
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div key={feature.title} className="card p-6">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary-700" />
                </div>
                <h3 className="heading-4 mb-2">{feature.title}</h3>
                <p className="text-small">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyatlar" className="section">
        <div className="container-app">
          <div className="text-center mb-16">
            <h2 className="heading-2 mb-4">Basit Fiyatlandırma</h2>
            <p className="text-body max-w-2xl mx-auto">
              İhtiyacınıza uygun planı seçin
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded mb-4 w-1/2"></div>
                  <div className="h-10 bg-slate-200 rounded mb-6"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-4 bg-slate-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              plans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`card p-6 flex flex-col ${plan.popular ? 'ring-2 ring-primary-600 shadow-lg' : ''}`}
                >
                  {plan.popular && (
                    <div className="bg-primary-600 text-white text-xs font-medium px-3 py-1 rounded-full self-start mb-4">
                      Popüler
                    </div>
                  )}
                  
                  <h3 className="heading-4 mb-1">{plan.name}</h3>
                  <p className="text-small mb-4">{plan.description}</p>
                  
                  <div className="flex items-baseline mb-6">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 ml-1">{plan.period}</span>}
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link 
                    to="/register" 
                    className={plan.popular ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
                  >
                    Başla
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="section bg-slate-50">
        <div className="container-app">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="heading-2 mb-4">Sık Sorulan Sorular</h2>
            </div>

            <div className="space-y-3">
              {faq.map((item, index) => (
                <div key={index} className="card">
                  <button
                    className="w-full p-5 text-left flex items-center justify-between"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="font-medium text-slate-900">{item.question}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5 text-slate-600 text-sm">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-800">
        <div className="container-app text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Hukuk Araştırmalarınızı Hızlandırın
          </h2>
          <p className="text-primary-200 mb-8 max-w-xl mx-auto">
            Ücretsiz hesap oluşturun ve yapay zeka destekli platformun avantajlarından yararlanın.
          </p>
          <Link to="/register" className="inline-flex items-center px-6 py-3 bg-white text-primary-800 font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Ücretsiz Başla
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container-app">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white">Yargısal Zeka</span>
              </div>
              <p className="text-sm max-w-sm">
                Yapay zeka destekli hukuk platformu ile yargı kararlarını analiz edin ve dilekçe taslakları oluşturun.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#ozellikler" className="hover:text-white transition-colors">Özellikler</a></li>
                <li><a href="#fiyatlar" className="hover:text-white transition-colors">Fiyatlar</a></li>
                <li><a href="#sss" className="hover:text-white transition-colors">SSS</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-white mb-3">Hesap</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-white transition-colors">Giriş Yap</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Kayıt Ol</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            © {new Date().getFullYear()} Yargısal Zeka. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: 'Akıllı Arama',
    description: 'Elasticsearch ile güçlendirilmiş hızlı ve isabetli karar araması.',
    icon: Search
  },
  {
    title: 'Yapay Zeka Analizi',
    description: 'Kararları otomatik analiz edin, anahtar kelimeler çıkarın.',
    icon: BarChart3
  },
  {
    title: 'Dilekçe Oluşturma',
    description: 'Analiz sonuçlarına göre profesyonel dilekçe taslakları.',
    icon: FileText
  },
  {
    title: 'Güvenli Platform',
    description: 'End-to-end şifreleme ve güvenli veri saklama.',
    icon: Shield
  }
];

const faq = [
  {
    question: 'Platform nasıl çalışır?',
    answer: 'Kayıt olduktan sonra hukuki olayınızı anlatın. Yapay zeka analiz yapar, anahtar kelimeleri çıkarır, ilgili kararları bulur ve size en uygun 3 kararı sunar. Dilekçe taslağı da otomatik oluşturulabilir.'
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'Evet, tüm veriler end-to-end şifrelenir ve güvenli sunucularda saklanır. KVKK uyumlu çalışıyoruz.'
  },
  {
    question: 'Ücretsiz deneme var mı?',
    answer: 'Evet, kayıt olduğunuzda 3 günlük ücretsiz deneme paketi otomatik tanımlanır.'
  },
  {
    question: 'Planımı değiştirebilir miyim?',
    answer: 'Evet, istediğiniz zaman planınızı yükseltebilir veya düşürebilirsiniz.'
  }
];

const getDescription = (name: string): string => {
  const map: Record<string, string> = {
    'Temel': 'Başlangıç için ideal',
    'Standart': 'Yoğun kullanım için',
    'Premium': 'Profesyoneller için'
  };
  return map[name] || 'Hukuk araştırmaları için';
};

const getFeatures = (plan: SubscriptionPlanDto): string[] => {
  const list: string[] = [];
  
  if (plan.keywordExtractionLimit < 0) list.push('Sınırsız anahtar kelime');
  else list.push(`${plan.keywordExtractionLimit} anahtar kelime`);
  
  if (plan.caseAnalysisLimit < 0) list.push('Sınırsız analiz');
  else list.push(`${plan.caseAnalysisLimit} olay analizi`);
  
  if (plan.searchLimit < 0) list.push('Sınırsız arama');
  else list.push(`${plan.searchLimit} arama`);
  
  if (plan.petitionLimit < 0) list.push('Sınırsız dilekçe');
  else if (plan.petitionLimit > 0) list.push(`${plan.petitionLimit} dilekçe`);
  
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
