import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setError(null);
      const res = await authService.register(data);
      login(res.token, res.user);
      navigate('/app');
    } catch (err: unknown) {
      const anyErr = err as any;
      const status = anyErr?.response?.status;
      const serverMsg = anyErr?.response?.data?.Mesaj || anyErr?.response?.data?.message;

      if (status === 409) {
        setError(serverMsg || 'Bu e-posta zaten kayıtlı');
      } else {
        setError(serverMsg || 'Kayıt işlemi başarısız oldu');
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-violet-900/50 to-cyan-900/50 items-center justify-center p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
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
            Ücretsiz Deneme ile Başlayın
          </h2>
          <p className="text-slate-300">
            Kayıt olduğunuzda 3 günlük ücretsiz deneme paketi otomatik olarak tanımlanır.
            Tüm özellikleri keşfedin.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
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
            <h1 className="text-2xl font-bold text-white mb-2">Hesap Oluştur</h1>
            <p className="text-slate-400">Ücretsiz hesabınızı oluşturun</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ad</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Adınız"
                    {...register('firstName')}
                    className={`input pl-10 ${errors.firstName ? 'border-red-500/50' : ''}`}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Soyad</label>
                <input
                  type="text"
                  placeholder="Soyadınız"
                  {...register('lastName')}
                  className={`input ${errors.lastName ? 'border-red-500/50' : ''}`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="ornek@email.com"
                  {...register('email')}
                  className={`input pl-10 ${errors.email ? 'border-red-500/50' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  placeholder="En az 6 karakter"
                  {...register('password')}
                  className={`input pl-10 ${errors.password ? 'border-red-500/50' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Ücretsiz Kayıt Ol'
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
              Giriş Yap
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Kayıt olarak{' '}
            <Link to="/terms" className="text-cyan-400 hover:underline">Kullanım Koşullarını</Link>
            {' '}ve{' '}
            <Link to="/privacy" className="text-cyan-400 hover:underline">Gizlilik Politikasını</Link>
            {' '}kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
}
