import { useEffect, useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

const CitizenAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    const { data } = await supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false });
    const filtered = ((data as any[]) || []).filter((a: any) => !a.target_role || a.target_role === 'citizen');
    setAlerts(filtered);
  };

  useEffect(() => {
    fetchAlerts();
    const channel = supabase.channel('citizen-alerts-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchAlerts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">Emergency alerts and status updates</p>
        </div>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No active alerts at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert: any) => (
              <Card key={alert.id} className={alert.type === 'critical' ? 'border-critical/30' : alert.type === 'warning' ? 'border-warning/30' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${alert.type === 'critical' ? 'bg-critical/10' : alert.type === 'warning' ? 'bg-warning/10' : 'bg-primary/10'}`}>
                      <AlertTriangle className={`h-5 w-5 ${alert.type === 'critical' ? 'text-critical' : alert.type === 'warning' ? 'text-warning' : 'text-primary'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`status-badge ${alert.type === 'critical' ? 'status-critical' : alert.type === 'warning' ? 'status-warning' : 'status-info'}`}>{alert.type}</span>
                        <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-foreground">{alert.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CitizenAlerts;
