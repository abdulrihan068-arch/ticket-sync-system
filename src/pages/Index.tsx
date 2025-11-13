import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/30">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold text-foreground">Brototype</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Complaint Management System
        </p>
        <p className="text-muted-foreground">
          Streamline your complaint resolution process
        </p>
        <Button size="lg" onClick={() => navigate('/auth')} className="mt-4">
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
