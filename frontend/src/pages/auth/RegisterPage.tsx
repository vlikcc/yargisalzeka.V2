import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from '../../validation/authSchemas';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/forms/FormField';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });
  const { login } = useAuth();
  const navigate = useNavigate();
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await authService.register(data);
      login(res.token, res.user);
  navigate('/app');
    } catch {
      alert('Kayıt başarısız');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold tracking-tight">Kayıt Ol</h2>
        <FormField label="Ad" error={errors.firstName?.message}>
          <Input {...register('firstName')} />
        </FormField>
        <FormField label="Soyad" error={errors.lastName?.message}>
          <Input {...register('lastName')} />
        </FormField>
        <FormField label="E-posta" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </FormField>
        <FormField label="Şifre" error={errors.password?.message}>
          <Input type="password" {...register('password')} />
        </FormField>
        <Button type="submit" className="w-full font-medium" disabled={isSubmitting}>{isSubmitting ? 'Kaydediliyor...' : 'Kayıt Ol'}</Button>
        <div className="text-xs text-center text-gray-500">Hesabın var mı? <Link to="/login" className="text-primary underline">Giriş Yap</Link></div>
      </form>
    </div>
  );
}
