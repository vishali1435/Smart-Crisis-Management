import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, MapPin, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  pending: 'status-warning',
  in_progress: 'status-info',
  completed: 'status-success',
};

const VolunteerTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchTasks = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('tasks').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false });
    setTasks((data as any[]) || []);
  };

  useEffect(() => {
    fetchTasks();
    const channel = supabase.channel('volunteer-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    const update: any = { status };
    if (status === 'completed') update.completed_at = new Date().toISOString();
    await supabase.from('tasks').update(update).eq('id', taskId);
    // Also update related incident
    const task = tasks.find((t: any) => t.id === taskId);
    if (task?.incident_id) {
      const incStatus = status === 'completed' ? 'resolved' : status === 'in_progress' ? 'in_progress' : 'assigned';
      await supabase.from('incidents').update({ status: incStatus } as any).eq('id', task.incident_id);
    }
    toast({ title: 'Task Updated', description: `Status changed to ${status}.` });
    setDetailOpen(false);
    fetchTasks();
  };

  const filtered = tasks.filter((t: any) => filter === 'all' || t.status === filter);
  const pending = tasks.filter((t: any) => t.status === 'pending').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
  const completed = tasks.filter((t: any) => t.status === 'completed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground">View and manage your assigned tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-warning">{pending}</p><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-primary">{inProgress}</p><p className="text-sm text-muted-foreground">In Progress</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-success">{completed}</p><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
        </div>

        <div className="flex justify-end">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Tasks ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tasks found.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((task: any) => (
                  <div key={task.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{task.title}</h3>
                          <span className={`status-badge ${statusColors[task.status] || 'status-info'}`}>{task.status}</span>
                          <span className={`status-badge ${task.priority === 'urgent' ? 'status-critical' : task.priority === 'high' ? 'status-warning' : 'status-info'}`}>{task.priority}</span>
                        </div>
                        {task.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {task.location}</p>}
                        {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(task.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedTask(task); setDetailOpen(true); }}><Eye className="h-3 w-3 mr-1" /> View</Button>
                        {task.status === 'pending' && <Button size="sm" onClick={() => updateTaskStatus(task.id, 'in_progress')}><Clock className="h-3 w-3 mr-1" /> Start</Button>}
                        {task.status === 'in_progress' && <Button size="sm" variant="success" onClick={() => updateTaskStatus(task.id, 'completed')}><CheckCircle2 className="h-3 w-3 mr-1" /> Complete</Button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask?.title}</DialogTitle>
              <DialogDescription>Task Details</DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Status:</span> <span className={`status-badge ${statusColors[selectedTask.status]}`}>{selectedTask.status}</span></div>
                  <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{selectedTask.priority}</span></div>
                  {selectedTask.location && <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {selectedTask.location}</div>}
                  {selectedTask.due_at && <div className="col-span-2"><span className="text-muted-foreground">Due:</span> {new Date(selectedTask.due_at).toLocaleString()}</div>}
                </div>
                {selectedTask.description && <div><p className="text-muted-foreground text-sm mb-1">Description:</p><p className="text-sm">{selectedTask.description}</p></div>}
                <div className="flex gap-2 justify-end">
                  {selectedTask.status === 'pending' && <Button onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')}>Start Task</Button>}
                  {selectedTask.status === 'in_progress' && <Button variant="success" onClick={() => updateTaskStatus(selectedTask.id, 'completed')}>Mark Complete</Button>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default VolunteerTasks;
