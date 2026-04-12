import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="text-center glass-card p-10 rounded-2xl max-w-md animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-warning/20">
            <AlertTriangle className="h-12 w-12 text-warning" />
          </div>
        </div>
        <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button variant="default" size="lg" onClick={() => navigate('/')} className="gap-2">
          <Home className="h-4 w-4" />
          Return Home
        </Button>
        <div className="mt-8 pt-6 border-t border-border">
          <Logo size="sm" />
        </div>
      </div>
    </div>
  );
};

export default NotFound;
