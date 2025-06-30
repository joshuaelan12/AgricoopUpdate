'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Bell,
  Home,
  Leaf,
  ListChecks,
  Search,
  Warehouse,
  FolderKanban,
  Users,
} from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster } from "@/components/ui/toaster"
import UserProfile from '@/components/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";


import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup';
    const isAdminPage = pathname.startsWith('/admin') || pathname === '/admin-dashboard';
    
    // Handle unauthenticated users
    if (!user) {
      if (!isAuthPage) {
        router.push('/login');
      }
      return;
    }

    // Handle authenticated users
    if (isAuthPage) {
      if (user.role === 'Admin') {
        router.push('/admin-dashboard');
      } else {
        router.push('/');
      }
      return;
    }

    if (isAdminPage && user.role !== 'Admin') {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have permission to view this page.",
      });
      router.push('/');
      return;
    }

  }, [user, loading, pathname, router, toast]);

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAdminPage = pathname.startsWith('/admin') || pathname === '/admin-dashboard';

  const showLoadingScreen = loading || 
                            (!user && !isAuthPage) ||
                            (user && isAuthPage) || 
                            (user && isAdminPage && user.role !== 'Admin');

  if (showLoadingScreen) {
    return (
        <html lang="en">
            <head>
                <title>AgriCoop</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet" />
            </head>
            <body className="font-body antialiased">
                <div className="flex min-h-screen w-full items-center justify-center bg-background">
                    <Leaf className="h-16 w-16 animate-spin text-primary" />
                </div>
            </body>
        </html>
    )
  }
  
  const isSpecialLayoutPage = isAuthPage || isAdminPage;

  if (isSpecialLayoutPage) {
    return (
         <html lang="en">
            <head>
                <title>AgriCoop</title>
                <meta name="description" content="Collaborative platform for agricultural cooperatives." />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet" />
            </head>
            <body className="font-body antialiased">
                {children}
                <Toaster />
            </body>
        </html>
    )
  }
  
  return (
    <html lang="en">
      <head>
        <title>AgriCoop</title>
        <meta name="description" content="Collaborative platform for agricultural cooperatives." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Belleza&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <Sidebar>
                    <SidebarHeader>
                      <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Leaf className="h-6 w-6 text-primary" />
                        <span className="font-headline text-2xl text-sidebar-foreground">AgriCoop</span>
                      </Link>
                    </SidebarHeader>
                    <SidebarContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="/" tooltip="Dashboard">
                            <Home />
                            <span>Dashboard</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="/projects" tooltip="Projects">
                            <FolderKanban />
                            <span>Projects</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="/members" tooltip="Members">
                            <Users />
                            <span>Members</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="/resources" tooltip="Resources">
                            <Warehouse />
                            <span>Resources</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton href="/checklist-builder" tooltip="Checklist Builder">
                            <ListChecks />
                            <span>Checklist Builder</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                      <SidebarMenu>
                        <SidebarMenuItem>
                           <UserProfile />
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                  <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <SidebarTrigger variant="outline" className="sm:hidden" />
                    <div className="relative ml-auto flex-1 md:grow-0">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                      />
                    </div>
                    <Button variant="outline" size="icon" className="ml-auto sm:ml-0 h-10 w-10">
                      <Bell className="h-5 w-5" />
                      <span className="sr-only">Toggle notifications</span>
                    </Button>
                  </header>
                  <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
                </SidebarInset>
            </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
