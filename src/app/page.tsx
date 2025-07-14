
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import type { AllocatedResource, Project, Task } from '@/lib/schemas';
import { cn } from '@/lib/utils';


// --- DATA INTERFACES ---
interface DashboardStats {
  totalProjects: number;
  activeMembers: number;
  resourceAlerts: number;
  lowStockItems: string[];
}

interface ResourceData {
  name: string;
  category: string;
  quantity: number;
  status: string;
  minStock?: number;
}

interface UpcomingTask {
    task: Task;
    projectId: string;
    projectTitle: string;
}

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeMembers: 0,
    resourceAlerts: 0,
    lowStockItems: [],
  });
  const [allocationSummary, setAllocationSummary] = useState<{ name: string, allocated: number }[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.companyId) {
      setLoading(false);
      setStats({ totalProjects: 0, activeMembers: 0, resourceAlerts: 0, lowStockItems: [] });
      setAllocationSummary([]);
      setUpcomingTasks([]);
      return;
    }

    setLoading(true);
    const { companyId } = user;

    const unsubscribes: (() => void)[] = [];

    // --- DEFINE REFS ---
    const projectsRef = collection(db, 'projects');
    const usersRef = collection(db, 'users');
    const resourcesRef = collection(db, 'resources');
    
    // --- REAL-TIME LISTENERS ---
    
    // Projects listener (for stats, upcoming tasks, and allocation summary)
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(projectsQuery, (snap) => {
        setStats(prev => ({ ...prev, totalProjects: snap.size }));
        
        const allProjects = snap.docs.map(doc => {
            const data = doc.data();
            const tasks = (data.tasks || []).map((task: any) => ({
                ...task,
                deadline: task.deadline?.toDate() ?? null,
            }));
            const allocatedResources = (data.allocatedResources || []).map((r: any) => r);
            return {
                id: doc.id,
                ...data,
                tasks,
                allocatedResources,
            }
        }) as Project[];

        // Calculate Upcoming Tasks
        const allIncompleteTasks: UpcomingTask[] = [];
        allProjects.forEach(project => {
            if (project.tasks && Array.isArray(project.tasks)) {
                project.tasks.forEach(task => {
                    if (task.status !== 'Completed') {
                        allIncompleteTasks.push({
                            task: task,
                            projectTitle: project.title,
                            projectId: project.id,
                        });
                    }
                });
            }
        });

        allIncompleteTasks.sort((a, b) => {
            if (!a.task.deadline) return 1;
            if (!b.task.deadline) return -1;
            return a.task.deadline.getTime() - b.task.deadline.getTime();
        });
        setUpcomingTasks(allIncompleteTasks.slice(0, 3));

        // Calculate Resource Allocation Summary
        const summary: { [name: string]: number } = {};
        allProjects.forEach(project => {
            if (project.allocatedResources && Array.isArray(project.allocatedResources)) {
                project.allocatedResources.forEach((resource: AllocatedResource) => {
                    if (summary[resource.name]) {
                        summary[resource.name] += resource.quantity;
                    } else {
                        summary[resource.name] = resource.quantity;
                    }
                });
            }
        });
        const summaryArray = Object.entries(summary)
            .map(([name, allocated]) => ({ name, allocated }))
            .sort((a, b) => b.allocated - a.allocated);
        setAllocationSummary(summaryArray);
    }));
    
    // Members listener (for stats)
    const membersQuery = query(usersRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(membersQuery, (snap) => {
      setStats(prev => ({ ...prev!, activeMembers: snap.size }));
    }));
    
    // Resources listener (for stats)
    const allResourcesQuery = query(resourcesRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(allResourcesQuery, (snap) => {
      const allResources = snap.docs.map(doc => doc.data()) as ResourceData[];

      const lowStockResources = allResources.filter(
        r => typeof r.quantity === 'number' && typeof r.minStock === 'number' && r.minStock > 0 && r.quantity < r.minStock
      );
      const needsMaintenanceResources = allResources.filter(
        r => r.status === 'Needs Maintenance'
      );

      const alertItems = [
        ...lowStockResources.map(r => r.name),
        ...needsMaintenanceResources.map(r => r.name)
      ];

      setStats(prev => ({
        ...prev,
        resourceAlerts: lowStockResources.length + needsMaintenanceResources.length,
        lowStockItems: alertItems,
      }));
    }));

    setLoading(false);

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  if (loading) {
    return <DashboardSkeleton />;
  }
  
  const resourceAlertText = () => {
      if (!stats || stats.resourceAlerts === 0) return "All resources are in good condition";
      const items = stats.lowStockItems.slice(0, 2).join(', ');
      const moreItems = stats.lowStockItems.length > 2 ? '...' : '';
      return `Attention needed for: ${items}${moreItems}`;
  };

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Total Projects</CardDescription>
            <CardTitle className="text-4xl font-headline">{stats?.totalProjects ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Managed by your cooperative
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Active Members</CardDescription>
            <CardTitle className="text-4xl font-headline">{stats?.activeMembers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              In your company
            </div>
          </CardContent>
        </Card>
        <Card className={cn({ "bg-destructive text-destructive-foreground": stats?.resourceAlerts > 0 })}>
          <CardHeader className="pb-2">
            <CardDescription className={cn("font-headline", { "text-destructive-foreground/80": stats?.resourceAlerts > 0 })}>Resources</CardDescription>
            <CardTitle className="text-4xl font-headline">Alerts: {stats?.resourceAlerts ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-xs text-muted-foreground truncate", { "text-destructive-foreground/70": stats?.resourceAlerts > 0 })}>
              {resourceAlertText()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline">Upcoming Tasks</CardTitle>
              <CardDescription>The next three tasks across all projects that need attention. Click a task to see project details.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTasks.map(({ task, projectTitle, projectId }) => (
                    <Link href={`/projects#${projectId}`} key={task.id} className="block group">
                      <div className="p-3 rounded-lg border bg-card group-hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm text-card-foreground">{task.title}</p>
                          {task.deadline && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">{format(new Date(task.deadline), 'PP')}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          In Project: <span className="font-medium">{projectTitle}</span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-full text-center text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                    <h3 className="text-lg font-medium">All Tasks Completed</h3>
                    <p className="text-sm">There are no pending tasks. Great job!</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/projects">
                        View All Projects
                    </Link>
                </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Resource Allocation Summary</CardTitle>
              <CardDescription>Total quantity of resources allocated across all projects.</CardDescription>
            </CardHeader>
            <CardContent>
              {allocationSummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={allocationSummary} margin={{ top: 5, right: 20, left: -10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
                      />
                      <Tooltip 
                        contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        cursor={{fill: 'hsl(var(--muted))'}}
                      />
                      <Bar dataKey="allocated" fill="hsl(var(--primary))" name="Allocated" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                      No resources are currently allocated to projects.
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- SKELETON COMPONENT ---
const DashboardSkeleton = () => (
  <div className="grid flex-1 items-start gap-4 md:gap-8">
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
       <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
