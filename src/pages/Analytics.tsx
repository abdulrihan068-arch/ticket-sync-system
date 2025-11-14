import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, Clock, Users, CheckCircle2 } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface ComplaintTrend {
  date: string;
  count: number;
}

interface StatusDistribution {
  name: string;
  value: number;
}

interface StaffPerformance {
  name: string;
  resolved: number;
  avgResolutionTime: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const Analytics = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<ComplaintTrend[]>([]);
  const [statusDist, setStatusDist] = useState<StatusDistribution[]>([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerformance[]>([]);
  const [stats, setStats] = useState({
    totalComplaints: 0,
    avgResolutionTime: 0,
    resolvedThisMonth: 0,
    activeStaff: 0
  });

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchAnalytics();
    }
  }, [user, role]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all complaints for analysis
      const { data: complaints, error } = await supabase
        .from('complaints')
        .select('*, profiles!complaints_student_id_fkey(name), assigned_profiles:profiles!complaints_assigned_to_fkey(name)')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate trends (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return format(date, 'MMM dd');
      });

      const trendData = last30Days.map(date => ({
        date,
        count: complaints?.filter(c => {
          const complaintDate = format(parseISO(c.created_at), 'MMM dd');
          return complaintDate === date;
        }).length || 0
      }));

      setTrends(trendData);

      // Calculate status distribution
      const statusData = [
        { name: 'Pending', value: complaints?.filter(c => c.status === 'pending').length || 0 },
        { name: 'In Progress', value: complaints?.filter(c => c.status === 'in_progress').length || 0 },
        { name: 'Resolved', value: complaints?.filter(c => c.status === 'resolved').length || 0 },
        { name: 'Closed', value: complaints?.filter(c => c.status === 'closed').length || 0 }
      ];

      setStatusDist(statusData);

      // Calculate staff performance
      const staffMap = new Map<string, { resolved: number; totalTime: number; count: number }>();

      complaints?.forEach(complaint => {
        if (complaint.assigned_to && complaint.status === 'resolved' && complaint.resolved_at) {
          const staffId = complaint.assigned_to;
          const staffName = complaint.assigned_profiles?.name || 'Unknown';
          const resolutionTime = new Date(complaint.resolved_at).getTime() - new Date(complaint.created_at).getTime();
          const hoursToResolve = resolutionTime / (1000 * 60 * 60);

          if (!staffMap.has(staffId)) {
            staffMap.set(staffId, { resolved: 0, totalTime: 0, count: 0 });
          }

          const staff = staffMap.get(staffId)!;
          staff.resolved++;
          staff.totalTime += hoursToResolve;
          staff.count++;
        }
      });

      const perfData = Array.from(staffMap.entries())
        .map(([id, data]) => {
          const complaint = complaints?.find(c => c.assigned_to === id);
          return {
            name: complaint?.assigned_profiles?.name || 'Unknown',
            resolved: data.resolved,
            avgResolutionTime: Math.round(data.totalTime / data.count)
          };
        })
        .sort((a, b) => b.resolved - a.resolved);

      setStaffPerf(perfData);

      // Calculate overall stats
      const resolved = complaints?.filter(c => c.status === 'resolved' || c.status === 'closed') || [];
      const totalResolutionTime = resolved.reduce((acc, c) => {
        if (c.resolved_at) {
          const time = new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
          return acc + (time / (1000 * 60 * 60));
        }
        return acc;
      }, 0);

      const thisMonth = complaints?.filter(c => {
        const complaintDate = new Date(c.created_at);
        const now = new Date();
        return complaintDate.getMonth() === now.getMonth() && 
               complaintDate.getFullYear() === now.getFullYear() &&
               (c.status === 'resolved' || c.status === 'closed');
      }).length || 0;

      setStats({
        totalComplaints: complaints?.length || 0,
        avgResolutionTime: resolved.length > 0 ? Math.round(totalResolutionTime / resolved.length) : 0,
        resolvedThisMonth: thisMonth,
        activeStaff: staffMap.size
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Analytics Dashboard">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComplaints}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime}h</div>
              <p className="text-xs text-muted-foreground">Average hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved This Month</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolvedThisMonth}</div>
              <p className="text-xs text-muted-foreground">Completed cases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeStaff}</div>
              <p className="text-xs text-muted-foreground">Handling complaints</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="status">Status Distribution</TabsTrigger>
            <TabsTrigger value="performance">Staff Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Complaint Trends (Last 30 Days)</CardTitle>
                <CardDescription>Daily complaint submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Complaints"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Current complaint status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={statusDist}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {statusDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance</CardTitle>
                <CardDescription>Resolved complaints and average resolution time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={staffPerf}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="resolved" 
                      fill="hsl(var(--primary))" 
                      name="Resolved"
                    />
                    <Bar 
                      dataKey="avgResolutionTime" 
                      fill="hsl(var(--accent))" 
                      name="Avg Time (hours)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
