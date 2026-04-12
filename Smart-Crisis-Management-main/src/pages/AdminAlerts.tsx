import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const AdminAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [newType, setNewType] = useState('info');
  const [targetRole, setTargetRole] = useState('all');

  const fetchAlerts = async () => {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
    setAlerts((data as any[]) || []);
  };

  useEffect(() => {
    fetchAlerts();
    const channel = supabase.channel('admin-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchAlerts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const broadcastAlert = async () => {
    if (!newMsg.trim()) return;
    const { error } = await supabase.from('alerts').insert({
      message: newMsg,
      type: newType,
      is_active: true,
      created_by: user?.id,
      target_role: targetRole === 'all' ? null : targetRole,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Alert Broadcast', description: 'Alert sent successfully.' });
      setNewMsg('');
    }
  };

  const dismissAlert = async (id: string) => {
    await supabase.from('alerts').update({ is_active: false } as any).eq('id', id);
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await supabase.from('alerts').delete().eq('id', id);
    fetchAlerts();
  };

  const activeAlerts = alerts.filter((a: any) => a.is_active);
  const dismissedAlerts = alerts.filter((a: any) => !a.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alerts Management</h1>
          <p className="text-muted-foreground">Broadcast and manage system alerts</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Broadcast New Alert</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="citizen">Citizens</SelectItem>
                  <SelectItem value="volunteer">Volunteers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Alert message..." className="flex-1" />
              <Button onClick={broadcastAlert}><Bell className="h-4 w-4 mr-1" /> Broadcast</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Active Alerts ({activeAlerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeAlerts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No active alerts.</p>
            ) : activeAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 flex-1">
                  <span className={`status-badge ${alert.type === 'critical' ? 'status-critical' : alert.type === 'warning' ? 'status-warning' : 'status-info'}`}>{alert.type}</span>
                  <span className="flex-1">{alert.message}</span>
                  <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => dismissAlert(alert.id)}>Dismiss</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {dismissedAlerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-muted-foreground">Dismissed Alerts ({dismissedAlerts.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {dismissedAlerts.slice(0, 20).map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 opacity-60">
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`status-badge ${alert.type === 'critical' ? 'status-critical' : alert.type === 'warning' ? 'status-warning' : 'status-info'}`}>{alert.type}</span>
                    <span>{alert.message}</span>
                    <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAlerts;
