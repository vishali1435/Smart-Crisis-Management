import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

const AdminLoginLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchLogs = async () => {
    const [logRes, profileRes] = await Promise.all([
      supabase.from('login_logs').select('*').order('login_time', { ascending: false }).limit(200),
      supabase.from('profiles').select('user_id, name, email'),
    ]);
    const profiles = (profileRes.data as any[]) || [];
    const enriched = ((logRes.data as any[]) || []).map((l: any) => {
      const profile = profiles.find((p: any) => p.user_id === l.user_id);
      return { ...l, user_name: profile?.name || 'Unknown', user_email: profile?.email || '' };
    });
    setLogs(enriched);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase.channel('admin-login-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_logs' }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = logs.filter((l: any) => {
    const matchesSearch = !search || l.user_name.toLowerCase().includes(search.toLowerCase()) || l.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || l.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Login Activity Logs</h1>
          <p className="text-muted-foreground">Track all user login and logout activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{logs.length}</p><p className="text-sm text-muted-foreground">Total Logins</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-success">{logs.filter((l: any) => l.login_status === 'success').length}</p><p className="text-sm text-muted-foreground">Successful</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-critical">{logs.filter((l: any) => l.login_status !== 'success').length}</p><p className="text-sm text-muted-foreground">Failed</p></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="citizen">Citizen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-accent" /> Login Logs ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Login Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Logout Time</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">IP Address</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Device</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No login logs found.</td></tr>
                  ) : filtered.map((log: any) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-3">
                        <p className="font-medium">{log.user_name}</p>
                        <p className="text-xs text-muted-foreground">{log.user_email}</p>
                      </td>
                      <td className="p-3 capitalize">{log.role}</td>
                      <td className="p-3">{new Date(log.login_time).toLocaleString()}</td>
                      <td className="p-3">{log.logout_time ? new Date(log.logout_time).toLocaleString() : '—'}</td>
                      <td className="p-3">{log.ip_address || '—'}</td>
                      <td className="p-3 max-w-[200px] truncate text-xs">{log.device_info || '—'}</td>
                      <td className="p-3"><span className={`status-badge ${log.login_status === 'success' ? 'status-success' : 'status-critical'}`}>{log.login_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminLoginLogs;
