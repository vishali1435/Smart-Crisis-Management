import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Users, MapPin, Settings, LogOut, Bell, FileText, History, Package, ClipboardList, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const roleNavItems: Record<NonNullable<UserRole>, NavItem[]> = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Alerts', icon: AlertTriangle, path: '/admin/alerts' },
    { label: 'Volunteers', icon: Users, path: '/admin/volunteers' },
    { label: 'Login Logs', icon: History, path: '/admin/logs' },
    { label: 'Resources', icon: Package, path: '/admin/resources' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ],
  volunteer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/volunteer' },
    { label: 'My Tasks', icon: ClipboardList, path: '/volunteer/tasks' },
    { label: 'Alerts', icon: Bell, path: '/volunteer/alerts' },
  ],
  citizen: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/citizen' },
    { label: 'Report Incident', icon: AlertTriangle, path: '/citizen/report' },
    { label: 'My Reports', icon: FileText, path: '/citizen/reports' },
    { label: 'Alerts', icon: Bell, path: '/citizen/alerts' },
    { label: 'Find Shelters', icon: Shield, path: '/citizen/shelters' },
  ],
};

const roleColors: Record<NonNullable<UserRole>, string> = {
  admin: 'from-primary to-accent',
  volunteer: 'from-success to-emerald-500',
  citizen: 'from-warning to-amber-400',
};

const DashboardLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, role } = useAuth();

  if (!role) {
    navigate('/');
    return null;
  }

  const navItems = roleNavItems[role];
  const colorGradient = roleColors[role];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed h-full">
        <div className="p-4 border-b border-sidebar-border"><Logo size="sm" /></div>
        <div className="p-4 border-b border-sidebar-border">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${colorGradient} bg-opacity-10`}>
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button key={item.path} variant={isActive ? 'secondary' : 'ghost'} className={cn('w-full justify-start gap-3', isActive && 'bg-sidebar-accent')} onClick={() => navigate(item.path)}>
                <Icon className="h-4 w-4" /> {item.label}
              </Button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 ml-64">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border bg-card/50">
          <ThemeToggle />
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
