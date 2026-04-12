import { useEffect, useState } from 'react';
import { Package, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const categories = ['Food', 'Water', 'Medical Kits', 'Rescue Equipment', 'Shelter', 'Clothing', 'General'];
const statuses = ['Available', 'Low', 'Out of Stock'];

const AdminResources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', category: 'General', quantity: 0, location: '', status: 'Available' });

  const fetchResources = async () => {
    const { data } = await supabase.from('resources').select('*').order('updated_at', { ascending: false });
    setResources((data as any[]) || []);
  };

  useEffect(() => {
    fetchResources();
    const channel = supabase.channel('admin-resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => fetchResources())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: 'General', quantity: 0, location: '', status: 'Available' });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ name: r.name, category: r.category, quantity: r.quantity, location: r.location || '', status: r.status });
    setDialogOpen(true);
  };

  const saveResource = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, last_updated_by: user?.id, updated_at: new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from('resources').update(payload as any).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Resource Updated' });
    } else {
      const { error } = await supabase.from('resources').insert(payload as any);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Resource Added' });
    }
    setDialogOpen(false);
    fetchResources();
  };

  const deleteResource = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id);
    toast({ title: 'Resource Removed' });
    fetchResources();
  };

  const filtered = resources.filter((r: any) => {
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'all' || r.category.toLowerCase() === catFilter.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const statusColor = (s: string) => s === 'Available' ? 'status-success' : s === 'Low' ? 'status-warning' : 'status-critical';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Resource Availability</h1>
            <p className="text-muted-foreground">Manage emergency resources and supplies</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Resource</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{resources.length}</p><p className="text-sm text-muted-foreground">Total Resources</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-success">{resources.filter((r: any) => r.status === 'Available').length}</p><p className="text-sm text-muted-foreground">Available</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-critical">{resources.filter((r: any) => r.status === 'Out of Stock').length}</p><p className="text-sm text-muted-foreground">Out of Stock</p></CardContent></Card>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..." className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Resources ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Last Updated</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No resources found.</td></tr>
                  ) : filtered.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 capitalize">{r.category}</td>
                      <td className="p-3">{r.quantity}</td>
                      <td className="p-3">{r.location || '—'}</td>
                      <td className="p-3"><span className={`status-badge ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="p-3 text-xs">{new Date(r.updated_at).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteResource(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Resource' : 'Add Resource'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Resource name" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Storage location" /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={saveResource}>{editing ? 'Update' : 'Add'} Resource</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminResources;
