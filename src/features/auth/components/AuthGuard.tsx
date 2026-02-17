import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '@/pages/Login';
import { GlobalPageSkeleton } from '@/shared/components/SkeletonTemplates';

export function AuthGuard() {
  const { user, loading } = useAuth();

  // Auto-open removed as per requirement
  // useEffect(() => {
  //     if (!loading && !user) {
  //         setShowModal(true);
  //     }
  // }, [user, loading]);

  if (loading) {
    return <GlobalPageSkeleton />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Outlet />;
}
