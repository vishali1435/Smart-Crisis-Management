import { useNavigate } from 'react-router-dom';
import { Shield, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

const RoleSelection = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      title: 'Admin',
      description: 'System control, analytics, and approvals',
      icon: Shield,
      variant: 'roleAdmin' as const,
      path: '/login/admin',
    },
    {
      id: 'volunteer',
      title: 'Volunteer',
      description: 'Task management and alert response',
      icon: Users,
      variant: 'roleVolunteer' as const,
      path: '/login/volunteer',
    },
    {
      id: 'citizen',
      title: 'Citizen',
      description: 'Incident reporting and help requests',
      icon: User,
      variant: 'roleCitizen' as const,
      path: '/login/citizen',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg glass-card animate-slide-up relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showTagline />
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription className="text-base">
            Select your role to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <Button
                key={role.id}
                variant={role.variant}
                size="xl"
                className={`w-full justify-start gap-4 animate-slide-up`}
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
                onClick={() => navigate(role.path)}
              >
                <Icon className="h-6 w-6" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{role.title}</span>
                  <span className="text-xs opacity-80">{role.description}</span>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
