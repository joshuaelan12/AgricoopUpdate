'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, UserPlus, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative">
        <div className="absolute top-4 right-4">
            <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </div>
      <div className="max-w-4xl w-full p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-headline text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, Admin. Choose your destination.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/" className="block">
            <Card className="hover:border-primary transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-headline text-2xl">
                  Go to Main App
                  <ArrowRight className="h-6 w-6 text-primary" />
                </CardTitle>
                <CardDescription>
                  Access the main dashboard, projects, and resources.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/create-user" className="block">
            <Card className="hover:border-primary transition-colors h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-headline text-2xl">
                  Create User Accounts
                  <UserPlus className="h-6 w-6 text-primary" />
                </CardTitle>
                 <CardDescription>
                  Add new members, managers, or accountants to your company.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
