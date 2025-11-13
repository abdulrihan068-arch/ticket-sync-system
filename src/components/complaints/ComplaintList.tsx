import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ComplaintCard from './ComplaintCard';
import { Loader2 } from 'lucide-react';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  category_id: string;
  student_id: string;
  assigned_to: string | null;
  categories: { name: string } | null;
  student_profile: { name: string; email: string } | null;
  assigned_profile: { name: string; email: string } | null;
}

interface ComplaintListProps {
  statusFilter: string;
  isStaff?: boolean;
  isAdmin?: boolean;
}

const ComplaintList = ({ statusFilter, isStaff, isAdmin }: ComplaintListProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, user]);

  const fetchComplaints = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('complaints')
        .select(`
          *,
          categories(name),
          student_profile:profiles!student_id(name, email),
          assigned_profile:profiles!assigned_to(name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (isStaff) {
        query = query.eq('assigned_to', user.id);
      } else if (!isAdmin) {
        query = query.eq('student_id', user.id);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComplaints(data as any || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No complaints found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaints.map((complaint) => (
        <ComplaintCard
          key={complaint.id}
          complaint={complaint}
          onUpdate={fetchComplaints}
        />
      ))}
    </div>
  );
};

export default ComplaintList;
