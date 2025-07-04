'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { format } from "date-fns";

// Actions, Schemas, Hooks
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { updateProjectPlanning, allocateResourceToProject, deallocateResourceFromProject } from '@/lib/actions/project.actions';
import { UpdateProjectPlanningInputSchema, AllocateResourceInputSchema, DeallocateResourceInputSchema } from '@/lib/schemas';
import type { UpdateProjectPlanningInput, AllocatedResource } from '@/lib/schemas';

// Firebase
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Icons
import { GanttChartSquare, Loader2, Edit, CalendarIcon as CalendarIconLucide, Eye, Package, Trash2, Plus, Users, DollarSign, Target, CheckCircle, Info } from "lucide-react";


// --- DATA INTERFACES ---
interface Resource {
  id: string;
  name: string;
  quantity: number;
}

interface UserData {
  uid: string;
  displayName: string;
}

interface PlanningProject {
  id: string;
  title: string;
  description: string;
  status: string;
  team: string[];
  priority?: 'Low' | 'Medium' | 'High';
  deadline?: Date | null;
  estimatedBudget?: number;
  objectives?: string;
  expectedOutcomes?: string;
  allocatedResources: AllocatedResource[];
}


// --- CONSTANTS & HELPERS ---
const priorities: PlanningProject['priority'][] = ['Low', 'Medium', 'High'];

const priorityBadgeVariant: { [key: string]: "secondary" | "default" | "destructive" } = {
  "Low": "secondary",
  "Medium": "default",
  "High": "destructive",
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});

// --- PROJECT PREVIEW DIALOG ---
function ProjectPreviewDialog({ project, users }: { project: PlanningProject, users: { [uid: string]: UserData } }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
          <span className="sr-only">Preview Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2"><Info />{project.title}</DialogTitle>
          <DialogDescription>{project.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
              <p>{project.status}</p>
            </div>
             <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
              <p>{project.priority}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Deadline</h4>
              <p>{project.deadline ? format(project.deadline, 'PPP') : 'Not set'}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Budget</h4>
              <p>{project.estimatedBudget ? currencyFormatter.format(project.estimatedBudget) : 'Not set'}</p>
            </div>
          </div>
          <Separator />
           <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Target />Objectives</h4>
              <p className="text-sm">{project.objectives || 'Not defined.'}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle />Expected Outcomes</h4>
              <p className="text-sm">{project.expectedOutcomes || 'Not defined.'}</p>
            </div>
          <Separator />
           <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users />Team Members</h4>
              <div className="flex flex-wrap gap-2">
                {project.team.map(uid => (
                   <Badge key={uid} variant="secondary">{users[uid]?.displayName || 'Unknown User'}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package />Allocated Resources</h4>
               {project.allocatedResources.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {project.allocatedResources.map(r => (
                        <li key={r.resourceId}>{r.name}: {r.quantity} kg</li>
                      ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No resources allocated.</p>
                )}
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button>Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// --- EDIT PLANNING DIALOG ---
function EditPlanningDialog({ project, resources, onActionComplete }: { project: PlanningProject, resources: Resource[], onActionComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Resource allocation state
  const [resourceToAllocate, setResourceToAllocate] = useState('');
  const [quantityToAllocate, setQuantityToAllocate] = useState<number | string>('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [isDeallocating, setIsDeallocating] = useState<string | null>(null);

  const form = useForm<UpdateProjectPlanningInput>({
    resolver: zodResolver(UpdateProjectPlanningInputSchema),
    defaultValues: {
      projectId: project.id,
      objectives: project.objectives || '',
      expectedOutcomes: project.expectedOutcomes || '',
      priority: project.priority || 'Medium',
      deadline: project.deadline || null,
      estimatedBudget: project.estimatedBudget || 0,
    },
  });

  const handleAllocateResource = async () => {
    if (!resourceToAllocate || !quantityToAllocate) {
      toast({ variant: 'destructive', title: 'Please select a resource and enter a quantity.' });
      return;
    }
    setIsAllocating(true);
    const result = await allocateResourceToProject({
      projectId: project.id,
      resourceId: resourceToAllocate,
      quantity: Number(quantityToAllocate),
    });

    if (result.success) {
      toast({ title: 'Resource Allocated' });
      setResourceToAllocate('');
      setQuantityToAllocate('');
      onActionComplete(); // This will refetch data for the entire page
    } else {
      toast({ variant: 'destructive', title: 'Allocation Failed', description: result.error });
    }
    setIsAllocating(false);
  };

  const handleDeallocateResource = async (resourceId: string) => {
    setIsDeallocating(resourceId);
    const result = await deallocateResourceFromProject({ projectId: project.id, resourceId });
    if (result.success) {
      toast({ title: 'Resource Deallocated' });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Deallocation Failed', description: result.error });
    }
    setIsDeallocating(null);
  };

  const onSubmit = async (values: UpdateProjectPlanningInput) => {
    const result = await updateProjectPlanning(values);
    if (result.success) {
      toast({
        title: "Planning Details Updated",
        description: `Details for "${project.title}" have been saved.`,
      });
      setOpen(false);
      onActionComplete();
    } else {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: result.error || "An unexpected error occurred.",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Plan Project: {project.title}</DialogTitle>
          <DialogDescription>
            Set objectives, deadlines, budgets, and allocate resources for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField control={form.control} name="objectives" render={({ field }) => (
              <FormItem>
                <FormLabel>Objectives</FormLabel>
                <FormControl><Textarea placeholder="What are the main goals of this project?" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            
            <FormField control={form.control} name="expectedOutcomes" render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Outcomes</FormLabel>
                <FormControl><Textarea placeholder="What are the tangible outcomes or deliverables?" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="deadline" render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                    <FormLabel className="mb-1.5">Deadline</FormLabel>
                     <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="estimatedBudget" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Budget ($)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 5000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            <DialogFooter className="sticky bottom-0 bg-background py-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
        
        <Separator className="my-6" />

        {/* --- Resource Allocation Section --- */}
        <div className="space-y-4">
            <h3 className="text-lg font-medium font-headline">Resource Allocation</h3>
            
            {/* Allocated Resources List */}
            <div>
              <label className="text-sm font-medium leading-none">Currently Allocated</label>
              <div className="mt-2 space-y-2">
                {project.allocatedResources.length > 0 ? (
                  project.allocatedResources.map(res => (
                    <div key={res.resourceId} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                      <div>
                        <p className="font-medium">{res.name}</p>
                        <p className="text-sm text-muted-foreground">{res.quantity} kg</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeallocateResource(res.resourceId)} disabled={isDeallocating === res.resourceId}>
                        {isDeallocating === res.resourceId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No resources allocated yet.</p>
                )}
              </div>
            </div>

            {/* Allocate New Resource Form */}
            <div>
                <label className="text-sm font-medium leading-none">Allocate New Resource</label>
                <div className="mt-2 flex items-end gap-2">
                    <div className="flex-grow">
                        <Select value={resourceToAllocate} onValueChange={setResourceToAllocate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a resource..." />
                            </SelectTrigger>
                            <SelectContent>
                                {resources.map(r => (
                                    <SelectItem key={r.id} value={r.id}>
                                        {r.name} ({r.quantity} kg available)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-28">
                         <Input type="number" placeholder="kg" value={quantityToAllocate} onChange={e => setQuantityToAllocate(e.target.value)} />
                    </div>
                    <Button onClick={handleAllocateResource} disabled={isAllocating}>
                        {isAllocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
        </div>
        <DialogFooter className="mt-4">
            <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// --- MAIN PAGE COMPONENT ---
export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: UserData }>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { companyId } = user;
      
      const projectsRef = collection(db, 'projects');
      const resourcesRef = collection(db, 'resources');
      const usersRef = collection(db, 'users');

      const pQuery = query(projectsRef, where('companyId', '==', companyId));
      const rQuery = query(resourcesRef, where('companyId', '==', companyId));
      const uQuery = query(usersRef, where('companyId', '==', companyId));

      const [projectsSnap, resourcesSnap, usersSnap] = await Promise.all([
        getDocs(pQuery),
        getDocs(rQuery),
        getDocs(uQuery),
      ]);
      
      const projectsData = projectsSnap.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              title: data.title,
              description: data.description,
              status: data.status,
              team: data.team,
              priority: data.priority,
              deadline: data.deadline?.toDate(),
              estimatedBudget: data.estimatedBudget,
              objectives: data.objectives,
              expectedOutcomes: data.expectedOutcomes,
              allocatedResources: data.allocatedResources || [],
          }
      }) as PlanningProject[];
      
      const resourcesData = resourcesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];
      const usersData = usersSnap.docs.reduce((acc, doc) => {
          acc[doc.id] = { uid: doc.id, ...(doc.data() as Omit<UserData, 'uid'>) };
          return acc;
        }, {} as { [uid: string]: UserData });


      setProjects(projectsData);
      setResources(resourcesData);
      setUsers(usersData);

    } catch (error) {
      console.error("Error fetching data:", error);
      setProjects([]);
      setResources([]);
      setUsers({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    fetchData();
  }, [user, authLoading, router, fetchData]);

  if (authLoading || loading || !user) {
    return <PlanningSkeleton />;
  }

  return (
    <div>
       <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Project Planning</h1>
        <p className="text-muted-foreground">
          Define objectives, timelines, and budgets for all projects.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Planning Dashboard</CardTitle>
          <CardDescription>An overview of key planning details for each project.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.title}</div>
                      <div className="text-sm text-muted-foreground">{project.status}</div>
                    </TableCell>
                    <TableCell>
                        {project.priority ? (
                             <Badge variant={priorityBadgeVariant[project.priority] || "secondary"}>
                                {project.priority}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </TableCell>
                    <TableCell>{project.deadline ? format(project.deadline, 'PP') : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{project.estimatedBudget ? currencyFormatter.format(project.estimatedBudget) : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ProjectPreviewDialog project={project} users={users} />
                        {(user.role === 'Admin' || user.role === 'Project Manager') && (
                          <EditPlanningDialog project={project} resources={resources} onActionComplete={fetchData} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center">
              <GanttChartSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Projects Found</h2>
              <p className="text-muted-foreground">
                Create a project on the 'Projects' page to begin planning.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- SKELETON COMPONENT ---
const PlanningSkeleton = () => (
   <div>
      <div className="mb-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 items-center p-2">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
);
