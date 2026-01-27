import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    // If loading takes more than 10 seconds, something is wrong
    const timeout = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          {showTimeout && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Nalaganje traja predolgo...</p>
              <button 
                onClick={() => window.location.href = '/login'}
                className="text-primary hover:underline text-sm"
              >
                Klikni za osvežitev
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
