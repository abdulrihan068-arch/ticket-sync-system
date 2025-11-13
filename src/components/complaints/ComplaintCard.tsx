import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, User, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ComplaintCardProps {
  complaint: any;
  onUpdate: () => void;
}

const statusColors = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-info/10 text-info border-info/20',
  resolved: 'bg-success/10 text-success border-success/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const ComplaintCard = ({ complaint, onUpdate }: ComplaintCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{complaint.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {complaint.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className={statusColors[complaint.status as keyof typeof statusColors]}>
            {complaint.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {complaint.categories && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{complaint.categories.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(complaint.created_at), 'MMM d, yyyy')}
            </div>
            {complaint.student_profile && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {complaint.student_profile.name}
              </div>
            )}
            {complaint.attachment_url && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-4 w-4" />
                <span>Attachment</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/complaint/${complaint.id}`)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplaintCard;
