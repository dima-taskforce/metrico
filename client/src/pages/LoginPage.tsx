import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { Input } from '../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      await authApi.login(data);
      const me = await authApi.me();
      setUser(me);
      navigate('/projects', { replace: true });
    } catch (err) {
      setError('root', {
        message: err instanceof Error ? err.message : 'Ошибка входа',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Войти</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Пароль"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white
              hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-400">или войти через</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="/api/auth/google"
              className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-300
                px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </a>
            <a
              href="/api/auth/yandex"
              className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-300
                px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#FC3F1D" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"/>
                <path fill="#fff" d="M13.32 7.04H12.5c-1.37 0-2.09.65-2.09 1.7 0 1.18.53 1.77 1.62 2.5l.9.6-2.57 3.82H8.62l2.37-3.54c-1.36-.97-2.13-1.91-2.13-3.43 0-1.94 1.35-3.25 3.62-3.25h2.58v9.22H13.3V7.04z"/>
              </svg>
              Яндекс
            </a>
            <a
              href="/api/auth/vk"
              className="flex items-center justify-center gap-2 w-full rounded-md border border-gray-300
                px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#0077FF" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"/>
                <path fill="#fff" d="M13.162 16.5h1.112s.336-.037.508-.222c.158-.17.153-.489.153-.489s-.021-1.494.672-1.714c.683-.217 1.559 1.443 2.489 2.081.703.484 1.237.378 1.237.378l2.487-.034s1.3-.08.683-1.103c-.05-.084-.358-.756-1.843-2.137-1.553-1.444-1.345-1.21.525-3.71 1.137-1.521 1.592-2.449 1.449-2.847-.136-.38-.975-.28-.975-.28l-2.8.018s-.208-.028-.362.064c-.151.09-.249.302-.249.302s-.441 1.174-1.029 2.173c-1.241 2.107-1.737 2.218-1.939 2.087-.471-.304-.354-1.226-.354-1.881 0-2.047.31-2.9-.604-3.12-.303-.073-.526-.121-1.3-.129-.995-.01-1.836.003-2.312.236-.317.155-.561.501-.412.521.184.024.601.112.822.413.286.389.276 1.263.276 1.263s.164 2.408-.384 2.708c-.376.203-.893-.211-2.003-2.104-.568-.981-.997-2.067-.997-2.067s-.083-.205-.232-.315c-.181-.132-.435-.174-.435-.174l-2.659.018s-.399.011-.545.185c-.13.155-.01.477-.01.477s2.081 4.873 4.437 7.327c2.16 2.248 4.613 2.1 4.613 2.1z"/>
              </svg>
              ВКонтакте
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
