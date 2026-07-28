import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationsBell } from './NotificationsBell';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <>
      <nav>
        <Link to="/">MathsMentor AI — test harness</Link>
        {user?.role === 'student' && <Link to="/student">Student</Link>}
        {user?.role === 'teacher' && <Link to="/teacher">Teacher</Link>}
        {user?.role === 'parent' && <Link to="/parent">Parent</Link>}
        <span className="spacer" />
        {user ? (
          <>
            <span className="muted" style={{ color: '#ccc' }}>
              {user.email} ({user.role})
            </span>
            <NotificationsBell />
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
