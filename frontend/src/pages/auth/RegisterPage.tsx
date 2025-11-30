import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Loader2, Scale } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary-800 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Scale className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Ücretsiz Deneme ile Başlayın
          </h2>
          <p className="text-primary-200">
            Kayıt olduğunuzda 3 günlük ücretsiz deneme paketi otomatik olarak tanımlanır. 
            Tüm özellikleri keşfedin.
          </p>
        </div>
      </div>
      
      {/* Right side - Form */}
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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Hesap Oluştur</h1>
            <p className="text-slate-500">Ücretsiz hesabınızı oluşturun</p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
              {error}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Adınız" 
                    {...register('firstName')} 
                    className={`input pl-10 ${errors.firstName ? 'border-error-300' : ''}`}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-error-600">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Soyad</label>
                <input 
                  type="text" 
                  placeholder="Soyadınız" 
                  {...register('lastName')} 
                  className={`input ${errors.lastName ? 'border-error-300' : ''}`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-error-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="ornek@email.com" 
                  {...register('email')} 
                  className={`input pl-10 ${errors.email ? 'border-error-300' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="En az 6 karakter" 
                  {...register('password')} 
                  className={`input pl-10 ${errors.password ? 'border-error-300' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
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
          <p className="mt-6 text-center text-sm text-slate-500">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-primary-700 hover:text-primary-800">
              Giriş Yap
            </Link>
          </p>
          
          {/* Terms */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Kayıt olarak{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">Kullanım Koşullarını</Link>
            {' '}ve{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">Gizlilik Politikasını</Link>
            {' '}kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
}
