
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Progress } from '@/components/ui/progress';

// --- DATA INTERFACES ---
interface DashboardStats {
  totalProjects: number;
  activeMembers: number;
  resourceAlerts: number;
  lowStockItems: string[];
}

type ProjectStatus = "Planning" | "In Progress" | "On Hold" | "Delayed" | "Completed";

const projectStatuses: ProjectStatus[] = ["Planning", "In Progress", "On Hold", "Delayed", "Completed"];

const statusColors: { [key in ProjectStatus]: string } = {
  "Planning": "bg-gray-500",
  "In Progress": "bg-blue-500",
  "On Hold": "bg-yellow-500",
  "Delayed": "bg-red-500",
  "Completed": "bg-green-600",
};

interface AllocatedResource {
  resourceId: string;
  name: string;
  quantity: number;
}

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number;
  allocatedResources: AllocatedResource[];
}

interface ResourceData {
  name: string;
  category: string;
  quantity: number | string;
  status: string;
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
  const [projectsByStatus, setProjectsByStatus] = useState<{ [key: string]: Project[] }>({});
  const [allocationSummary, setAllocationSummary] = useState<{ name: string, allocated: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.companyId) {
      setLoading(false);
      setStats({ totalProjects: 0, activeMembers: 0, resourceAlerts: 0, lowStockItems: [] });
      setProjectsByStatus({});
      setAllocationSummary([]);
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
    
    // Projects listener (for stats, project board, and allocation summary)
    const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
    unsubscribes.push(onSnapshot(projectsQuery, (snap) => {
        setStats(prev => ({ ...prev, totalProjects: snap.size }));
        const allProjects = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Project[];

        const groupedByStatus = allProjects.reduce((acc, project) => {
            const status = project.status;
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(project);
            return acc;
        }, {} as { [key: string]: Project[] });
        setProjectsByStatus(groupedByStatus);

        // Calculate Resource Allocation Summary
        const summary: { [name: string]: number } = {};
        allProjects.forEach(project => {
            if (project.allocatedResources && Array.isArray(project.allocatedResources)) {
                project.allocatedResources.forEach(resource => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Project Board</CardTitle>
              <CardDescription>Drag to scroll through project statuses.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pr-0">
              <div className="overflow-x-auto">
                <div className="flex gap-4 p-4 min-w-max">
                  {projectStatuses.map(status => (
                      <div key={status} className="w-[280px] flex-shrink-0">
                          <div className="flex items-center justify-between p-2 rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
                                <h3 className="font-semibold text-foreground text-sm">{status}</h3>
                              </div>
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                  {projectsByStatus[status]?.length || 0}
                              </span>
                          </div>
                          <div className="space-y-2 p-2 rounded-b-lg bg-muted/50 h-full min-h-[200px] max-h-[400px] overflow-y-auto">
                              {(projectsByStatus[status] || []).map(project => (
                                  <Card key={project.id} className="p-3 bg-card hover:bg-card/90 cursor-pointer">
                                      <p className="font-medium text-sm text-card-foreground">{project.title}</p>
                                      <div className="flex items-center justify-between mt-2">
                                          <span className="text-xs text-muted-foreground">{project.progress}% complete</span>
                                      </div>
                                      <Progress value={project.progress} className="mt-2 h-1.5" />
                                  </Card>
                              ))}
                              {(!projectsByStatus[status] || projectsByStatus[status].length === 0) && (
                                  <div className="text-center text-sm text-muted-foreground pt-10">
                                      No projects here.
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
                </div>
              </div>
            </CardContent>
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
                      <Bar dataKey="allocated" fill="hsl(var(--primary))" name="Allocated (kg)" radius={[4, 4, 0, 0]} />
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
          <CardContent className="pl-0 pr-0">
            <div className="overflow-x-auto">
              <div className="flex gap-4 p-4 min-w-max">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-[280px] flex-shrink-0">
                    <div className="flex items-center justify-between p-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                    <div className="space-y-2 p-2 rounded-b-lg bg-muted/50">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
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
