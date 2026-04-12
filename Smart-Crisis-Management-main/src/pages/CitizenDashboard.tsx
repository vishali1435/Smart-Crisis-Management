import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Bell, Shield, Phone, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const emergencyContacts = [
  { name: 'Emergency Hotline', number: '911', type: 'primary' },
  { name: 'Crisis Center', number: '1-800-555-0199', type: 'secondary' },
  { name: 'Medical Emergency', number: '1-800-555-0123', type: 'secondary' },
];

const statusColors: Record<string, string> = {
  reported: 'status-warning',
  in_progress: 'status-warning',
  resolved: 'status-success',
};

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myReports, setMyReports] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(true);

  const fetchData = async () => {
    const [reportRes, alertRes] = await Promise.all([
      supabase.from('incidents').select('*').eq('reporter_id', user?.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    setMyReports((reportRes.data as any[]) || []);
    setAlerts((alertRes.data as any[]) || []);
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    const channel = supabase.channel('citizen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const criticalAlert = alerts.find((a: any) => a.type === 'critical');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citizen Dashboard</h1>
            <p className="text-muted-foreground">Stay informed and report incidents</p>
          </div>
          <Button variant="warning" className="gap-2" onClick={() => navigate('/citizen/report')}>
            <Plus className="h-4 w-4" /> Report Incident
          </Button>
        </div>

        {showEmergencyBanner && criticalAlert && (
          <div className="p-4 rounded-lg bg-critical/10 border border-critical/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-critical" />
                <div>
                  <p className="font-semibold text-critical">Active Emergency Alert</p>
                  <p className="text-sm text-foreground">{criticalAlert.message}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEmergencyBanner(false)}>Dismiss</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/citizen/report')}>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <p className="font-medium">Report Incident</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/citizen/reports')}>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium">My Reports ({myReports.length})</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/citizen/alerts')}>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-critical/20 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-critical" />
              </div>
              <p className="font-medium">Alerts ({alerts.length})</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/citizen/shelters')}>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium">Find Shelters</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-critical" /> Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <a key={index} href={`tel:${contact.number}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-primary">{contact.number}</p>
                  </div>
                  <Button variant={contact.type === 'primary' ? 'critical' : 'outline'} size="sm"><Phone className="h-4 w-4" /></Button>
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> My Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {myReports.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reports yet. Report an incident to get started.</p>
              ) : (
                <div className="space-y-3">
                  {myReports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`status-badge ${statusColors[report.status] || 'status-info'}`}>{report.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-warning" /> Active Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                  <span className={`status-badge ${alert.type === 'critical' ? 'status-critical' : alert.type === 'warning' ? 'status-warning' : 'status-info'}`}>{alert.type}</span>
                  <span>{alert.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
