import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const statusColors: Record<string, string> = {
  reported: 'status-warning',
  in_progress: 'status-warning',
  resolved: 'status-success',
};

const CitizenReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);

  const fetchReports = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('incidents').select('*').eq('reporter_id', user.id).order('created_at', { ascending: false });
    setReports((data as any[]) || []);
  };

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel('citizen-reports-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchReports())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Reports</h1>
          <p className="text-muted-foreground">All incidents you have reported</p>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No reports yet. Report an incident to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report: any) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{report.title}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.category} • {report.location} • {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`status-badge ${statusColors[report.status] || 'status-info'}`}>{report.status}</span>
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

export default CitizenReports;
