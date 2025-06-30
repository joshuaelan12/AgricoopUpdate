'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, Timestamp } from 'firebase/firestore';
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
  tasksDueSoon: number;
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

const staticResourceAllocationData = [
  { month: 'Jan', seeds: 400, fertilizer: 240 },
  { month: 'Feb', seeds: 300, fertilizer: 139 },
  { month: 'Mar', seeds: 200, fertilizer: 980 },
  { month: 'Apr', seeds: 278, fertilizer: 390 },
  { month: 'May', seeds: 189, fertilizer: 480 },
  { month: 'Jun', seeds: 239, fertilizer: 380 },
];

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  "Completed": "default",
  "In Progress": "outline",
  "Overdue": "destructive",
  "Pending": "secondary"
};

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [resourceAllocation, setResourceAllocation] = useState<ResourceAllocation[]>(staticResourceAllocationData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.companyId) {
      const fetchDashboardData = async () => {
        setLoading(true);
        try {
          const { companyId } = user;

          // --- DEFINE REFS ---
          const projectsRef = collection(db, 'projects');
          const usersRef = collection(db, 'users');
          const resourcesRef = collection(db, 'resources');
          const tasksRef = collection(db, 'tasks');
          const resourceUsageRef = collection(db, 'resourceUsage');
          
          // --- DEFINE QUERIES ---
          const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
          const membersQuery = query(usersRef, where('companyId', '==', companyId));
          const resourceAlertsQuery = query(resourcesRef, where('companyId', '==', companyId), where('status', 'in', ['Low Stock', 'Needs Maintenance']));
          
          const sevenDaysFromNow = new Date();
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
          const tasksDueSoonQuery = query(tasksRef, 
            where('companyId', '==', companyId),
            where('status', '!=', 'Completed'),
            where('dueDate', '<=', Timestamp.fromDate(sevenDaysFromNow))
          );
          
          const recentTasksQuery = query(tasksRef, where('companyId', '==', companyId), orderBy('updatedAt', 'desc'), limit(5));
          const projectProgressQuery = query(projectsRef, where('companyId', '==', companyId), where('status', 'in', ['In Progress', 'On Hold', 'Delayed']), limit(5));
          const resourceAllocationQuery = query(resourceUsageRef, where('companyId', '==', companyId), orderBy('monthIndex', 'asc'), limit(6));

          // --- EXECUTE QUERIES ---
          const [
            projectsSnap, membersSnap, resourcesAlertsSnap, tasksDueSoonSnap,
            recentTasksSnap, projectProgressSnap, resourceAllocationSnap
          ] = await Promise.all([
            getDocs(projectsQuery), getDocs(membersQuery), getDocs(resourceAlertsQuery), getDocs(tasksDueSoonQuery),
            getDocs(recentTasksQuery), getDocs(projectProgressQuery), getDocs(resourceAllocationQuery)
          ]);
          
          // --- PROCESS & SET STATE ---
          setStats({
            totalProjects: projectsSnap.size,
            activeMembers: membersSnap.size,
            resourceAlerts: resourcesAlertsSnap.size,
            tasksDueSoon: tasksDueSoonSnap.size,
            lowStockItems: resourcesAlertsSnap.docs.map(doc => doc.data().name),
          });

          setRecentTasks(recentTasksSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, updatedAt: doc.data().updatedAt.toDate() })) as RecentTask[]);
          setProjectProgress(projectProgressSnap.docs.map(doc => ({ name: doc.data().title, progress: doc.data().progress })));

          const allocationData = resourceAllocationSnap.docs.map(doc => doc.data() as ResourceAllocation);
          if (allocationData.length > 0) {
            setResourceAllocation(allocationData);
          }

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    } else if (!user && loading) {
      setLoading(false);
    }
  }, [user, loading]);

  if (loading) {
    return <DashboardSkeleton />;
  }
  
  const resourceAlertText = () => {
      if (!stats || stats.resourceAlerts === 0) return "All resources are stocked";
      const items = stats.lowStockItems.slice(0, 2).join(' and ');
      return `Low on ${items}`;
  };

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
            <CardDescription className="font-headline">Tasks Due Soon</CardDescription>
            <CardTitle className="text-4xl font-headline">{stats?.tasksDueSoon ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              In the next 7 days
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
            <CardTitle className="font-headline">Resource Allocation (Sample)</CardTitle>
            <CardDescription>Monthly usage of key resources.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
    </div>
  );
}

// --- SKELETON COMPONENT ---
const DashboardSkeleton = () => (
  <div className="grid flex-1 items-start gap-4 md:gap-8">
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
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
