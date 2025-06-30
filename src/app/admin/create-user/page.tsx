'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createUser } from '@/lib/actions/user.actions';
import type { CreateUserInput } from '@/lib/schemas';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  displayName: z.string().min(1, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['Project Manager', 'Member', 'Accountant']),
});

const roles = ['Project Manager', 'Member', 'Accountant'];

export default function CreateUserPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      role: 'Member',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!adminUser) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in as an admin to perform this action.',
      });
      return;
    }
    setIsSubmitting(true);

    const input: CreateUserInput = {
      ...values,
      companyId: adminUser.companyId,
    };

    try {
      const result = await createUser(input);
      if (result.success && result.user) {
        toast({
          title: 'User Created',
          description: `An account for ${result.user.displayName} has been successfully created.`,
        });
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Creation Failed',
          description: result.error || 'An unknown error occurred.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-lg w-full">
        <CardHeader>
          <div className="relative flex justify-center mb-2">
             <Link href="/admin-dashboard" className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /><span className="sr-only">Back</span></Button>
            </Link>
            <h1 className="text-3xl font-headline">Create New User</h1>
          </div>
            <CardDescription className="text-center">
              Add a new user to your company: <strong>{adminUser?.companyName}</strong>
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create User'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
