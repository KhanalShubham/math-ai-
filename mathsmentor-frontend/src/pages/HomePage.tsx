import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user } = useAuth();
  if (user?.role === 'student') return <Navigate to="/student" replace />;
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (user?.role === 'parent') return <Navigate to="/parent" replace />;

  return (
    <section>
      <h1>MathsMentor AI — test harness</h1>
      <p className="muted">
        A thin, unstyled harness to exercise the real backend end-to-end (login, diagnostic,
        practice, teacher roster, parent view, notifications) — not the product UI.
      </p>
    </section>
  );
}
