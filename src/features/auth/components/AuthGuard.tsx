import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from './LoginPage';

export function AuthGuard() {
  const { user, loading } = useAuth();

  // Auto-open removed as per requirement
  // useEffect(() => {
  //     if (!loading && !user) {
  //         setShowModal(true);
  //     }
  // }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          {/* Optional: Add a subtle loading text or keep it minimal */}
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Outlet />;
}
