import { useEffect, useState } from 'react';
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, MapPin, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  reported: 'status-critical',
  pending: 'status-warning',
  assigned: 'status-info',
  accepted: 'status-info',
  in_progress: 'status-warning',
  resolved: 'status-success',
};

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [assignedIncidents, setAssignedIncidents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [myStatus, setMyStatus] = useState('available');
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    const [taskRes, alertRes, statusRes, incRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('volunteer_status').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('incidents').select('*').eq('assigned_volunteer_id', user.id).order('created_at', { ascending: false }),
    ]);
    setTasks((taskRes.data as any[]) || []);
    setAlerts((alertRes.data as any[]) || []);
    setAssignedIncidents((incRes.data as any[]) || []);
    if (statusRes.data) {
      setMyStatus((statusRes.data as any).status);
      setIsApproved((statusRes.data as any).approved ?? false);
    } else {
      setIsApproved(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    const channel = supabase.channel('volunteer-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const updateStatus = async (status: string) => {
    const { data: existing } = await supabase.from('volunteer_status').select('id').eq('user_id', user?.id).maybeSingle();
    if (existing) {
      await supabase.from('volunteer_status').update({ status, updated_at: new Date().toISOString() } as any).eq('user_id', user?.id);
    } else {
      await supabase.from('volunteer_status').insert({ user_id: user?.id, status } as any);
    }
    setMyStatus(status);
    toast({ title: 'Status Updated', description: `You are now ${status}.` });
  };

  const updateIncidentStatus = async (incidentId: string, status: string) => {
    await supabase.from('incidents').update({ status } as any).eq('id', incidentId);
    // Also update related task
    if (status === 'resolved') {
      await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() } as any).eq('incident_id', incidentId).eq('assigned_to', user?.id);
    } else if (status === 'in_progress') {
      await supabase.from('tasks').update({ status: 'in_progress' } as any).eq('incident_id', incidentId).eq('assigned_to', user?.id);
    }
    fetchData();
    toast({ title: 'Incident Updated', description: `Status changed to ${status}.` });
    setDetailOpen(false);
  };

  const activeIncidents = assignedIncidents.filter((i: any) => i.status !== 'resolved');
  const completedIncidents = assignedIncidents.filter((i: any) => i.status === 'resolved');

  const priorityColors: Record<string, string> = { urgent: 'status-critical', high: 'status-warning', medium: 'status-info', low: 'status-success' };

  if (isApproved === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isApproved) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <h2 className="text-2xl font-bold">Pending Approval</h2>
              <p className="text-muted-foreground">
                Your volunteer registration is awaiting admin approval. You'll get full access once an administrator reviews and approves your application.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted-foreground">Your volunteer dashboard</p>
          </div>
          <span className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${myStatus === 'available' ? 'bg-success animate-pulse' : myStatus === 'busy' ? 'bg-warning' : 'bg-muted-foreground'}`} />
            Status: {myStatus}
          </span>
        </div>

        {alerts.length > 0 && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium text-warning">Active Alerts</span>
            </div>
            {alerts.map((alert: any) => (
              <p key={alert.id} className="text-sm text-foreground">• {alert.message}</p>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div><p className="text-sm text-muted-foreground">Assigned Incidents</p><p className="text-3xl font-bold mt-1">{activeIncidents.length}</p></div>
                <div className="p-3 rounded-lg bg-primary/10"><ClipboardList className="h-5 w-5 text-primary" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div><p className="text-sm text-muted-foreground">In Progress</p><p className="text-3xl font-bold mt-1">{assignedIncidents.filter((i: any) => i.status === 'in_progress').length}</p></div>
                <div className="p-3 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-3xl font-bold mt-1">{completedIncidents.length}</p></div>
                <div className="p-3 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Assigned Incidents</CardTitle>
            <CardDescription>Incidents assigned to you — update their status</CardDescription>
          </CardHeader>
          <CardContent>
            {activeIncidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No incidents assigned to you yet.</p>
            ) : (
              <div className="space-y-4">
                {activeIncidents.map((inc: any) => (
                  <div key={inc.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{inc.title}</h3>
                          <span className={`status-badge ${statusColors[inc.status] || 'status-info'}`}>{inc.status}</span>
                          <span className={`status-badge ${inc.severity === 'critical' ? 'status-critical' : inc.severity === 'high' ? 'status-warning' : 'status-info'}`}>{inc.severity}</span>
                        </div>
                        {inc.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {inc.location}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(inc.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedIncident(inc); setDetailOpen(true); }}><Eye className="h-3 w-3 mr-1" /> Details</Button>
                      {inc.status === 'assigned' && (
                        <Button variant="default" size="sm" onClick={() => updateIncidentStatus(inc.id, 'accepted')}>Accept</Button>
                      )}
                      {(inc.status === 'accepted' || inc.status === 'assigned') && (
                        <Button variant="warning" size="sm" onClick={() => updateIncidentStatus(inc.id, 'in_progress')}>Start</Button>
                      )}
                      {inc.status === 'in_progress' && (
                        <Button variant="success" size="sm" onClick={() => updateIncidentStatus(inc.id, 'resolved')}><CheckCircle2 className="h-3 w-3 mr-1" /> Resolve</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Report Availability</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button variant={myStatus === 'available' ? 'success' : 'outline'} className="flex-1" onClick={() => updateStatus('available')}>Available</Button>
            <Button variant={myStatus === 'busy' ? 'warning' : 'outline'} className="flex-1" onClick={() => updateStatus('busy')}>Busy</Button>
            <Button variant={myStatus === 'offline' ? 'default' : 'outline'} className="flex-1" onClick={() => updateStatus('offline')}>Offline</Button>
          </CardContent>
        </Card>

        {/* Incident Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedIncident?.title}</DialogTitle>
              <DialogDescription>Incident Details</DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <span className={`status-badge ${statusColors[selectedIncident.status]}`}>{selectedIncident.status}</span></div>
                  <div><span className="text-muted-foreground">Severity:</span> <span className="capitalize">{selectedIncident.severity}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {selectedIncident.location}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Date:</span> {new Date(selectedIncident.created_at).toLocaleString()}</div>
                </div>
                {selectedIncident.description && <div><p className="text-muted-foreground text-sm mb-1">Description:</p><p className="text-sm">{selectedIncident.description}</p></div>}
                {selectedIncident.image_url && <img src={selectedIncident.image_url} alt="Incident" className="rounded-lg max-h-48 object-cover" />}
                <div className="flex gap-2 justify-end">
                  {selectedIncident.status === 'assigned' && <Button onClick={() => updateIncidentStatus(selectedIncident.id, 'accepted')}>Accept</Button>}
                  {(selectedIncident.status === 'accepted' || selectedIncident.status === 'assigned') && <Button variant="warning" onClick={() => updateIncidentStatus(selectedIncident.id, 'in_progress')}>Start Work</Button>}
                  {selectedIncident.status === 'in_progress' && <Button variant="success" onClick={() => updateIncidentStatus(selectedIncident.id, 'resolved')}>Mark Resolved</Button>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
