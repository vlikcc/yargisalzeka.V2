import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, Scale } from 'lucide-react';
import { useState } from 'react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ 
    resolver: zodResolver(loginSchema) 
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      const res = await authService.login(data);
      login(res.token, res.user);
      navigate('/app');
    } catch (e) {
      setError('E-posta veya şifre hatalı');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Yargısal Zeka</span>
          </Link>
          
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Giriş Yap</h1>
            <p className="text-slate-500">Hesabınıza giriş yaparak devam edin</p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
              {error}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="ornek@email.com" 
                  {...register('email')} 
                  className={`input pl-10 ${errors.email ? 'border-error-300 focus:border-error-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  {...register('password')} 
                  className={`input pl-10 ${errors.password ? 'border-error-300 focus:border-error-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>
            
            <button 
              type="submit" 
              className="btn-primary w-full justify-center py-2.5" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
          
          {/* Register link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="font-medium text-primary-700 hover:text-primary-800">
              Ücretsiz Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary-800 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Hukuki Araştırmalarınızı Hızlandırın
          </h2>
          <p className="text-primary-200">
            Yapay zeka destekli platform ile yargı kararlarını analiz edin, 
            anahtar kelimeleri çıkarın ve profesyonel dilekçe taslakları oluşturun.
          </p>
        </div>
      </div>
    </div>
  );
}
