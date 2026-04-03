import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <span className="navbar-brand">⚡ QuizPortal</span>
      <div className="navbar-actions">
        <span className="navbar-user">👤 {user?.name} <span style={{opacity:0.5}}>({user?.role})</span></span>
        <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
