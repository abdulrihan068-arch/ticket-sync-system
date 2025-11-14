import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      const { data, error } = await supabase.rpc('has_any_admin');
      
      if (error) throw error;
      
      // If no admin exists, redirect to setup
      if (!data) {
        navigate('/setup');
        return;
      }
    } catch (error) {
      console.error('Error checking setup:', error);
    } finally {
      setCheckingSetup(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
