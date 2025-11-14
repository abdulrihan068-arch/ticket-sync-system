import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

const Setup = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase.rpc('has_any_admin');
      
      if (error) throw error;
      
      if (data) {
        setAdminExists(true);
        // Redirect to auth if admin already exists
        setTimeout(() => navigate('/auth'), 2000);
      }
    } catch (error) {
      console.error('Error checking admin:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to check admin status',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Call edge function to create first admin
      const { data, error } = await supabase.functions.invoke('create-first-admin', {
        body: { email, password, name, batch }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Success!',
        description: 'Admin account created successfully',
      });

      // Sign in the new admin
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create admin account',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-2 text-primary" />
            <CardTitle>Setup Complete</CardTitle>
            <CardDescription>
              An admin account already exists. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-2 text-primary" />
          <CardTitle>Initial Setup</CardTitle>
          <CardDescription>
            Create the first admin account for your Brototype complaint system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@brototype.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch (Optional)</Label>
              <Input
                id="batch"
                type="text"
                placeholder="e.g., 2024-A"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                'Create Admin Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
