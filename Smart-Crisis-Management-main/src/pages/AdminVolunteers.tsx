import { useEffect, useState } from 'react';
import { Users, MapPin, Phone, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AdminVolunteers = () => {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchVolunteers = async () => {
    const [volRes, profileRes, incRes] = await Promise.all([
      supabase.from('volunteer_status').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('incidents').select('id, assigned_volunteer_id, status'),
    ]);
    const profiles = (profileRes.data as any[]) || [];
    const incidents = (incRes.data as any[]) || [];
    const vols = ((volRes.data as any[]) || []).map((v: any) => {
      const profile = profiles.find((p: any) => p.user_id === v.user_id);
      const assignedIncidents = incidents.filter((i: any) => i.assigned_volunteer_id === v.user_id);
      const activeCount = assignedIncidents.filter((i: any) => i.status !== 'resolved').length;
      const resolvedCount = assignedIncidents.filter((i: any) => i.status === 'resolved').length;
      return {
        ...v,
        name: profile?.name || 'Unknown',
        email: profile?.email,
        phone: profile?.phone,
        address: profile?.address,
        latitude: profile?.latitude,
        longitude: profile?.longitude,
        activeIncidents: activeCount,
        resolvedIncidents: resolvedCount,
      };
    });
    setVolunteers(vols);
  };

  useEffect(() => {
    fetchVolunteers();
    const channel = supabase.channel('admin-volunteers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteer_status' }, () => fetchVolunteers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const approveVolunteer = async (userId: string) => {
    await supabase.from('volunteer_status').update({ approved: true } as any).eq('user_id', userId);
    toast({ title: 'Volunteer Approved', description: 'The volunteer can now access the system.' });
    fetchVolunteers();
  };

  const rejectVolunteer = async (userId: string) => {
    await supabase.from('volunteer_status').delete().eq('user_id', userId);
    toast({ title: 'Volunteer Rejected', description: 'The volunteer registration has been rejected.' });
    fetchVolunteers();
  };

  const pendingVolunteers = volunteers.filter((v: any) => !v.approved);
  const approvedVolunteers = volunteers.filter((v: any) => v.approved);

  const filtered = approvedVolunteers.filter((v: any) => {
    const matchesSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const available = approvedVolunteers.filter((v: any) => v.status === 'available').length;
  const busy = approvedVolunteers.filter((v: any) => v.status === 'busy').length;

  const VolunteerCard = ({ v, showActions }: { v: any; showActions?: boolean }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
      <div className="space-y-1">
        <p className="font-medium">{v.name}</p>
        {v.email && <p className="text-sm text-muted-foreground">{v.email}</p>}
        {v.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {v.phone}</p>}
        {v.latitude && v.longitude && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</p>}
        {v.address && <p className="text-xs text-muted-foreground">{v.address}</p>}
        {v.approved && <p className="text-xs text-muted-foreground">Active: {v.activeIncidents} | Resolved: {v.resolvedIncidents}</p>}
      </div>
      <div className="flex items-center gap-2">
        {showActions ? (
          <>
            <Button size="sm" variant="success" onClick={() => approveVolunteer(v.user_id)}>
              <CheckCircle className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => rejectVolunteer(v.user_id)}>
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </>
        ) : (
          <span className={`status-badge ${v.status === 'available' ? 'status-success' : v.status === 'busy' ? 'status-warning' : 'status-info'}`}>{v.status}</span>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Volunteer Management</h1>
          <p className="text-muted-foreground">View, approve, and manage registered volunteers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{volunteers.length}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-warning">{pendingVolunteers.length}</p><p className="text-sm text-muted-foreground">Pending Approval</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-success">{available}</p><p className="text-sm text-muted-foreground">Available</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-warning">{busy}</p><p className="text-sm text-muted-foreground">Busy</p></CardContent></Card>
        </div>

        <Tabs defaultValue={pendingVolunteers.length > 0 ? 'pending' : 'approved'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Approval
              {pendingVolunteers.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-bold">{pendingVolunteers.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved Volunteers</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-warning" /> Pending Approvals ({pendingVolunteers.length})</CardTitle></CardHeader>
              <CardContent>
                {pendingVolunteers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending volunteer registrations.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingVolunteers.map((v: any) => <VolunteerCard key={v.id} v={v} showActions />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search volunteers..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Approved Volunteers ({filtered.length})</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No approved volunteers found.</p>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((v: any) => <VolunteerCard key={v.id} v={v} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminVolunteers;
