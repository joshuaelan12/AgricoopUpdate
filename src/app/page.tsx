
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

// --- DATA INTERFACES ---
interface DashboardStats {
  totalProjects: number;
  activeMembers: number;
  resourceAlerts: number;
  lowStockItems: string[];
}

interface RecentTask {
  id: string;
  name: string;
  assignedTo: string;
  status: string;
  projectName: string;
  updatedAt: Date;
}

interface ProjectProgress {
  name: string;
  progress: number;
}

interface ResourceAllocation {
    month: string;
    seeds: number;
    fertilizer: number;
}

interface ResourceData {
  name: string;
  category: string;
  quantity: number | string;
  status: string;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  "Completed": "default",
  "In Progress": "outline",
  "Overdue": "destructive",
  "Pending": "secondary"
};

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeMembers: 0,
    resourceAlerts: 0,
    lowStockItems: [],
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [resourceAllocation, setResourceAllocation] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.companyId) {
      setLoading(false);
      setStats({ totalProjects: 0, activeMembers: 0, resourceAlerts: 0, lowStockItems: [] });
      setRecentTasks([]);
      setProjectProgress([]);
      setResourceAllocation([]);
      return;
    }

    setLoading(true);
    const { companyId } = user;

    const unsubscribes: (() => void)[] = [];

    // --- DEFINE REFS ---
    const projectsRef = collection(db, 'projects');
    const usersRef = collection(db, 'users');
    const resourcesRef = collection(db, 'resources');
    const tasksRef = collection(db, 'tasks');
    const resourceUsageRef = collection(db, 'resourceUsage');
    
    // --- REAL-TIME LISTENERS ---
    
    // Projects listener (for stats and progress chart)
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(projectsQuery, (snap) => {
      setStats(prev => ({ ...prev!, totalProjects: snap.size }));
      const activeProjects = snap.docs
        .map(doc => doc.data())
        .filter(p => ['In Progress', 'On Hold', 'Delayed'].includes(p.status))
        .slice(0, 5)
        .map(p => ({ name: p.title, progress: p.progress }));
      setProjectProgress(activeProjects);
    }));
    
    // Members listener (for stats)
    const membersQuery = query(usersRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(membersQuery, (snap) => {
      setStats(prev => ({ ...prev!, activeMembers: snap.size }));
    }));
    
    // Resources listener (for stats)
    const allResourcesQuery = query(resourcesRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(allResourcesQuery, (snap) => {
      const LOW_STOCK_THRESHOLD = 10;
      const allResources = snap.docs.map(doc => doc.data()) as ResourceData[];

      const lowStockResources = allResources.filter(
        r => r.category === 'Inputs' && typeof r.quantity === 'number' && r.quantity < LOW_STOCK_THRESHOLD
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

    // Recent tasks listener
    const recentTasksQuery = query(tasksRef, where('companyId', '==', companyId), orderBy('updatedAt', 'desc'), limit(5));
    unsubscribes.push(onSnapshot(recentTasksQuery, (snap) => {
        const tasksData = snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                updatedAt: data.updatedAt?.toDate() // Safely convert timestamp
            };
        }).filter(t => t.updatedAt) as RecentTask[];
      setRecentTasks(tasksData);
    }));

    // Resource allocation listener
    const resourceAllocationQuery = query(resourceUsageRef, where('companyId', '==', companyId), orderBy('monthIndex', 'asc'), limit(6));
    unsubscribes.push(onSnapshot(resourceAllocationQuery, (snap) => {
      setResourceAllocation(snap.docs.map(doc => doc.data() as ResourceAllocation));
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Resources</CardDescription>
            <CardTitle className="text-4xl font-headline">Alerts: {stats?.resourceAlerts ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground truncate">
              {resourceAlertText()}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>
              An overview of the latest task updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTasks.length > 0 ? (
                  recentTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.name}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          Assigned to: {task.assignedTo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[task.status] || 'secondary'}>{task.status}</Badge>
                      </TableCell>
                      <TableCell>{task.projectName}</TableCell>
                      <TableCell className="text-right">{formatDistanceToNow(task.updatedAt, { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">No recent activity.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Project Progress</CardTitle>
            <CardDescription>Completion status of active projects.</CardDescription>
          </CardHeader>
          <CardContent>
             {projectProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={projectProgress} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{fontSize: "14px"}}/>
                        <Bar dataKey="progress" fill="hsl(var(--primary))" name="Progress (%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="flex justify-center items-center h-[250px] text-muted-foreground">No active projects to display.</div>
              )}
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle className="font-headline">Resource Allocation</CardTitle>
            <CardDescription>Monthly usage of key resources.</CardDescription>
          </CardHeader>
          <CardContent>
            {resourceAllocation.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={resourceAllocation} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip 
                    contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Line type="monotone" dataKey="seeds" stroke="hsl(var(--primary))" strokeWidth={2} name="Seeds (kg)" />
                    <Line type="monotone" dataKey="fertilizer" stroke="hsl(var(--accent))" strokeWidth={2} name="Fertilizer (kg)" />
                </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                    No resource usage data available to display chart.
                </div>
            )}
          </CardContent>
        </Card>
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    </div>
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
);
