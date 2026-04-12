import { useEffect, useState } from 'react';
import { AlertTriangle, Users, CheckCircle, Clock, MapPin, Activity, History, UserCheck, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const statusColors: Record<string, string> = {
  reported: 'status-critical',
  pending: 'status-warning',
  assigned: 'status-info',
  accepted: 'status-info',
  in_progress: 'status-warning',
  resolved: 'status-success',
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertType, setNewAlertType] = useState('info');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [nearbyVolunteers, setNearbyVolunteers] = useState<any[]>([]);

  const fetchData = async () => {
    const [incRes, alertRes, volRes, logRes, profileRes] = await Promise.all([
      supabase.from('incidents').select('*').order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('volunteer_status').select('*'),
      supabase.from('login_logs').select('*').order('login_time', { ascending: false }).limit(50),
      supabase.from('profiles').select('*'),
    ]);

    const profiles = (profileRes.data as any[]) || [];
    const incs = ((incRes.data as any[]) || []).map((inc: any) => {
      const reporter = profiles.find((p: any) => p.user_id === inc.reporter_id);
      const assignedVol = profiles.find((p: any) => p.user_id === inc.assigned_volunteer_id);
      return { ...inc, reporter_name: reporter?.name || 'Unknown', assigned_volunteer_name: assignedVol?.name };
    });

    const vols = ((volRes.data as any[]) || []).map((v: any) => {
      const profile = profiles.find((p: any) => p.user_id === v.user_id);
      return { ...v, name: profile?.name || 'Unknown', phone: profile?.phone, latitude: profile?.latitude, longitude: profile?.longitude, approved: v.approved ?? false };
    });

    const logs = ((logRes.data as any[]) || []).map((l: any) => {
      const profile = profiles.find((p: any) => p.user_id === l.user_id);
      return { ...l, user_name: profile?.name || 'Unknown' };
    });

    setIncidents(incs);
    setAlerts((alertRes.data as any[]) || []);
    setVolunteers(vols);
    setLoginLogs(logs);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_status' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const broadcastAlert = async () => {
    if (!newAlertMsg.trim()) return;
    const { error } = await supabase.from('alerts').insert({ message: newAlertMsg, type: newAlertType, is_active: true, created_by: user?.id } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Alert Broadcast', description: 'Alert sent successfully.' });
      setNewAlertMsg('');
    }
  };

  const openAssignDialog = (incident: any) => {
    setSelectedIncident(incident);
    // Sort volunteers by distance if incident has coordinates
    const incLat = incident.latitude;
    const incLon = incident.longitude;
    const available = volunteers.filter((v: any) => v.status === 'available' && v.approved);
    
    if (incLat && incLon) {
      const sorted = available
        .map((v: any) => ({
          ...v,
          distance: v.latitude && v.longitude ? haversineDistance(incLat, incLon, v.latitude, v.longitude) : Infinity,
        }))
        .sort((a: any, b: any) => a.distance - b.distance);
      setNearbyVolunteers(sorted);
    } else {
      setNearbyVolunteers(available);
    }
    setAssignDialogOpen(true);
  };

  const assignVolunteer = async (volunteerId: string) => {
    if (!selectedIncident) return;
    await supabase.from('incidents').update({
      assigned_volunteer_id: volunteerId,
      status: 'assigned',
    } as any).eq('id', selectedIncident.id);

    // Create a task for the volunteer
    await supabase.from('tasks').insert({
      title: `Respond to: ${selectedIncident.title}`,
      description: selectedIncident.description,
      assigned_to: volunteerId,
      assigned_by: user?.id,
      incident_id: selectedIncident.id,
      location: selectedIncident.location,
      priority: selectedIncident.severity === 'critical' ? 'urgent' : selectedIncident.severity,
      status: 'pending',
    } as any);

    toast({ title: 'Volunteer Assigned', description: 'Incident has been assigned to volunteer.' });
    setAssignDialogOpen(false);
    fetchData();
  };

  const activeIncidents = incidents.filter((i: any) => i.status !== 'resolved');
  const availableVols = volunteers.filter((v: any) => v.status === 'available');
  const today = new Date().toISOString().split('T')[0];
  const resolvedToday = incidents.filter((i: any) => i.status === 'resolved' && i.updated_at?.startsWith(today));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time incident monitoring and management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: 'Active Incidents', value: activeIncidents.length, icon: AlertTriangle, color: 'text-critical', bg: 'bg-critical/10' },
            { title: 'Available Volunteers', value: availableVols.length, icon: Users, color: 'text-success', bg: 'bg-success/10' },
            { title: 'Resolved Today', value: resolvedToday.length, icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
            { title: 'Total Incidents', value: incidents.length, icon: Activity, color: 'text-accent', bg: 'bg-accent/10' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.title}</p>
                    <p className="text-3xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Broadcast Alert */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Broadcast Alert</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <select value={newAlertType} onChange={(e) => setNewAlertType(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <input value={newAlertMsg} onChange={(e) => setNewAlertMsg(e.target.value)} placeholder="Alert message..." className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <Button variant="critical" onClick={broadcastAlert}>Broadcast</Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="incidents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            <TabsTrigger value="logs">Login Logs</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Incidents Tab */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> All Incidents</CardTitle>
                <CardDescription>Click to view details or assign volunteers</CardDescription>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No incidents reported yet.</p>
                ) : (
                  <div className="space-y-3">
                    {incidents.map((inc: any) => (
                      <div key={inc.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{inc.title}</h3>
                              <span className={`status-badge ${statusColors[inc.status] || 'status-info'}`}>{inc.status}</span>
                              {inc.severity && <span className={`status-badge ${inc.severity === 'critical' ? 'status-critical' : inc.severity === 'high' ? 'status-warning' : 'status-info'}`}>{inc.severity}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {inc.location}</p>
                            <p className="text-xs text-muted-foreground mt-1">Reported by: {inc.reporter_name} • {new Date(inc.created_at).toLocaleString()}</p>
                            {inc.assigned_volunteer_name && <p className="text-xs text-primary mt-1">Assigned to: {inc.assigned_volunteer_name}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedIncident(inc); setDetailDialogOpen(true); }}><Eye className="h-3 w-3 mr-1" /> View</Button>
                            {(inc.status === 'reported' || inc.status === 'pending') && (
                              <Button size="sm" variant="default" onClick={() => openAssignDialog(inc)}><UserCheck className="h-3 w-3 mr-1" /> Assign</Button>
                            )}
                            {inc.status !== 'resolved' && (
                              <Button size="sm" variant="success" onClick={async () => {
                                await supabase.from('incidents').update({ status: 'resolved' } as any).eq('id', inc.id);
                                fetchData();
                              }}>Resolve</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Volunteers Tab */}
          <TabsContent value="volunteers">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-success" /> Registered Volunteers</CardTitle></CardHeader>
              <CardContent>
                {volunteers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No volunteers registered yet.</p>
                ) : (
                  <div className="space-y-3">
                    {volunteers.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{v.name}</p>
                          {v.phone && <p className="text-sm text-muted-foreground">{v.phone}</p>}
                          {v.latitude && v.longitude && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</p>}
                        </div>
                        <span className={`status-badge ${v.status === 'available' ? 'status-success' : v.status === 'busy' ? 'status-warning' : 'status-info'}`}>{v.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-accent" /> Login Activity Logs</CardTitle></CardHeader>
              <CardContent>
                {loginLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No login activity recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Login Time</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Logout Time</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Device</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map((log: any) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-3">{log.user_name}</td>
                            <td className="p-3 capitalize">{log.role}</td>
                            <td className="p-3">{new Date(log.login_time).toLocaleString()}</td>
                            <td className="p-3">{log.logout_time ? new Date(log.logout_time).toLocaleString() : '—'}</td>
                            <td className="p-3 max-w-[200px] truncate text-xs">{log.device_info || '—'}</td>
                            <td className="p-3"><span className={`status-badge ${log.login_status === 'success' ? 'status-success' : 'status-critical'}`}>{log.login_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No active alerts.</p>
                ) : (
                  alerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className={`status-badge ${alert.type === 'critical' ? 'status-critical' : alert.type === 'warning' ? 'status-warning' : 'status-info'}`}>{alert.type}</span>
                        <span>{alert.message}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await supabase.from('alerts').update({ is_active: false } as any).eq('id', alert.id);
                        fetchData();
                      }}>Dismiss</Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Volunteer Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Volunteer</DialogTitle>
              <DialogDescription>Select a volunteer to assign to "{selectedIncident?.title}"</DialogDescription>
            </DialogHeader>
            {nearbyVolunteers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No available volunteers.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {nearbyVolunteers.map((v: any) => (
                  <div key={v.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div>
                      <p className="font-medium">{v.name}</p>
                      {v.distance !== Infinity && <p className="text-xs text-muted-foreground">{v.distance.toFixed(1)} km away</p>}
                      {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                    </div>
                    <Button size="sm" onClick={() => assignVolunteer(v.user_id)}>Assign</Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Incident Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedIncident?.title}</DialogTitle>
              <DialogDescription>Incident Details</DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <span className={`status-badge ${statusColors[selectedIncident.status]}`}>{selectedIncident.status}</span></div>
                  <div><span className="text-muted-foreground">Severity:</span> <span className="capitalize">{selectedIncident.severity}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selectedIncident.type}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="capitalize">{selectedIncident.category || selectedIncident.type}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {selectedIncident.location}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Reporter:</span> {selectedIncident.reporter_name}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Date:</span> {new Date(selectedIncident.created_at).toLocaleString()}</div>
                  {selectedIncident.assigned_volunteer_name && <div className="col-span-2"><span className="text-muted-foreground">Assigned To:</span> {selectedIncident.assigned_volunteer_name}</div>}
                </div>
                {selectedIncident.description && <div><p className="text-muted-foreground text-sm mb-1">Description:</p><p className="text-sm">{selectedIncident.description}</p></div>}
                {selectedIncident.image_url && (
                  <div><p className="text-muted-foreground text-sm mb-1">Evidence:</p><img src={selectedIncident.image_url} alt="Incident" className="rounded-lg max-h-48 object-cover" /></div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
