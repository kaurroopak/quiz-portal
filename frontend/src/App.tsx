import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';
import QuizPage from './pages/student/QuizPage';
import ResultPage from './pages/student/ResultPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminQuizDetail from './pages/admin/AdminQuizDetail';
import AdminSessionReport from './pages/admin/AdminSessionReport';

const ProtectedRoute = ({ children, role }: { children: JSX.Element; role?: string }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/quiz/:sessionId" element={<ProtectedRoute role="student"><QuizPage /></ProtectedRoute>} />
      <Route path="/result/:sessionId" element={<ProtectedRoute role="student"><ResultPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/quiz/:quizId" element={<ProtectedRoute role="admin"><AdminQuizDetail /></ProtectedRoute>} />
      <Route path="/admin/session/:sessionId" element={<ProtectedRoute role="admin"><AdminSessionReport /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
