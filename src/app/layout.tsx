'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Home,
  Leaf,
  ListChecks,
  Warehouse,
  FolderKanban,
  Users,
  GanttChartSquare,
  History,
  ClipboardList,
  Sheet,
} from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster"
import UserProfile from '@/components/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import GlobalSearch from '@/components/global-search';
import NotificationsPopover from '@/components/notifications-popover';


import './globals.css';

function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isActive = (path: string) => pathname === path;

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full flex-row bg-muted/40">
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
                            <SidebarMenuButton asChild tooltip="Dashboard" isActive={isActive('/')}>
                                <Link href="/">
                                    <Home />
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Projects" isActive={isActive('/projects')}>
                                <Link href="/projects">
                                    <FolderKanban />
                                    <span>Projects</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Members" isActive={isActive('/members')}>
                                <Link href="/members">
                                    <Users />
                                    <span>Members</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Resources" isActive={isActive('/resources')}>
                                <Link href="/resources">
                                    <Warehouse />
                                    <span>Resources</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Planning" isActive={isActive('/planning')}>
                                <Link href="/planning">
                                    <GanttChartSquare />
                                    <span>Planning</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Outputs" isActive={isActive('/outputs')}>
                                <Link href="/outputs">
                                    <ClipboardList />
                                    <span>Outputs</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Checklist Builder" isActive={isActive('/checklist-builder')}>
                                <Link href="/checklist-builder">
                                    <ListChecks />
                                    <span>Checklist Builder</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Activity Log" isActive={isActive('/activity-log')}>
                                <Link href="/activity-log">
                                    <History />
                                    <span>Activity Log</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                           <SidebarMenuButton asChild tooltip="Reports" isActive={isActive('/reports')}>
                                <Link href="/reports">
                                    <Sheet />
                                    <span>Reports</span>
                                </Link>
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

                <SidebarInset>
                  <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <SidebarTrigger variant="outline" />
                    <GlobalSearch />
                    <NotificationsPopover />
                  </header>
                  <main className="flex-1 p-6">{children}</main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}

function AuthAndRoutingController({ children }: { children: React.ReactNode }) {
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
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <Leaf className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The app will now throw an error if Firebase is not configured.
  // The error is caught by the `error.tsx` boundary which displays a helpful guide.
  // No need to explicitly call a check function here.

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
        <AuthAndRoutingController>{children}</AuthAndRoutingController>
        <Toaster />
      </body>
    </html>
  );
}
