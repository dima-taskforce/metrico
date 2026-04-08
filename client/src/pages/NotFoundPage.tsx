import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold text-gray-800">404</h1>
      <p className="text-gray-500">Страница не найдена</p>
      <Link to="/projects" className="text-primary-600 hover:underline">
        На главную
      </Link>
    </div>
  );
}
