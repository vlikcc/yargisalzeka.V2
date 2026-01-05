import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen flex bg-slate-900">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img
              src="/images/logo-symbol.png"
              alt="Yargısal Zeka"
              className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Yargısal Zeka
            </span>
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Giriş Yap</h1>
            <p className="text-slate-400">Hesabınıza giriş yaparak devam edin</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="ornek@email.com"
                  {...register('email')}
                  className={`input pl-10 ${errors.email ? 'border-red-500/50 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`input pl-10 ${errors.password ? 'border-red-500/50 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
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
          <p className="mt-6 text-center text-sm text-slate-400">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="font-medium text-cyan-400 hover:text-cyan-300">
              Ücretsiz Kayıt Ol
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-cyan-900/50 to-violet-900/50 items-center justify-center p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md text-center relative z-10">
          <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center mx-auto mb-8">
            <img
              src="/images/logo-symbol.png"
              alt="Logo"
              className="w-12 h-12 object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]"
            />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Hukuki Araştırmalarınızı Hızlandırın
          </h2>
          <p className="text-slate-300">
            Yapay zeka destekli platform ile yargı kararlarını analiz edin,
            anahtar kelimeleri çıkarın ve profesyonel dilekçe taslakları oluşturun.
          </p>
        </div>
      </div>
    </div>
  );
}
