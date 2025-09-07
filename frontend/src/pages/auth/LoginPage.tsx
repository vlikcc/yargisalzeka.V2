import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/forms/FormField';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const { login } = useAuth();
  const navigate = useNavigate();
  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await authService.login(data);
      login(res.token, res.user);
  navigate('/app');
    } catch {
      // Basit hata gösterimi ileride toasta dönüşecek
      alert('Giriş başarısız');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-neutral-50 via-primary-50/10 to-neutral-50">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-glow animate-float">
            <div className="w-12 h-12 bg-white rounded-xl"></div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Yargısal Zeka</h1>
          <p className="text-neutral-600">Hukuki araştırma yapay zekası</p>
        </div>
        
        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="glass-card space-y-6 animate-slide-up">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-neutral-900">Hoş Geldiniz</h2>
            <p className="text-sm text-neutral-600">Devam etmek için giriş yapın</p>
          </div>
          
          <div className="space-y-4">
            <FormField label="E-posta Adresi" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input 
                  type="email" 
                  placeholder="ornek@site.com" 
                  {...register('email')} 
                  className="pl-12"
                />
              </div>
            </FormField>
            
            <FormField label="Şifre" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  {...register('password')} 
                  className="pl-12"
                />
              </div>
            </FormField>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-neutral-600">Beni hatırla</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Şifremi unuttum
            </Link>
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-primary py-3 font-semibold shadow-glow" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Giriş Yap
              </>
            )}
          </Button>
          
          <div className="text-center pt-4 border-t border-neutral-200/50">
            <p className="text-sm text-neutral-600">
              Henüz hesabınız yok mu?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                Ücretsiz Kayıt Ol
              </Link>
            </p>
          </div>
        </form>
        
        {/* Footer */}
        <p className="text-center text-xs text-neutral-500 mt-8">
          Giriş yaparak{' '}
          <Link to="/terms" className="text-primary-600 hover:underline">Kullanım Koşullarını</Link>
          {' '}ve{' '}
          <Link to="/privacy" className="text-primary-600 hover:underline">Gizlilik Politikasını</Link>
          {' '}kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
