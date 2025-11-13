import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ComplaintList from '@/components/complaints/ComplaintList';

const StaffDashboard = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  return (
    <DashboardLayout title="Assigned Complaints">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Complaint Queue</CardTitle>
            <CardDescription>
              View and respond to assigned complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
              
              <TabsContent value={statusFilter} className="mt-6">
                <ComplaintList statusFilter={statusFilter} isStaff />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
