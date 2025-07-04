'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { format } from "date-fns";

// Actions, Schemas, Hooks
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { updateProjectPlanning } from '@/lib/actions/project.actions';
import { UpdateProjectPlanningInputSchema } from '@/lib/schemas';
import type { UpdateProjectPlanningInput } from '@/lib/schemas';

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
import { cn } from "@/lib/utils";

// Icons
import { GanttChartSquare, Loader2, Edit, CalendarIcon as CalendarIconLucide, Leaf } from "lucide-react";


// --- DATA INTERFACE ---
interface PlanningProject {
  id: string;
  title: string;
  status: string;
  priority?: 'Low' | 'Medium' | 'High';
  deadline?: Date | null;
  estimatedBudget?: number;
  objectives?: string;
  expectedOutcomes?: string;
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


// --- EDIT PLANNING DIALOG ---
function EditPlanningDialog({ project, onActionComplete }: { project: PlanningProject, onActionComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Plan Project: {project.title}</DialogTitle>
          <DialogDescription>
            Set objectives, deadlines, and budgets for this project.
          </DialogDescription>
        </DialogHeader>
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

            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// --- MAIN PAGE COMPONENT ---
export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('companyId', '==', user.companyId));
      const querySnapshot = await getDocs(q);
      
      const projectsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              title: data.title,
              status: data.status,
              priority: data.priority,
              deadline: data.deadline?.toDate(),
              estimatedBudget: data.estimatedBudget,
              objectives: data.objectives,
              expectedOutcomes: data.expectedOutcomes,
          }
      }) as PlanningProject[];
      
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'Admin' && user.role !== 'Project Manager')) {
        router.push('/');
        return;
    }
    fetchProjects();
  }, [user, authLoading, router, fetchProjects]);

  if (authLoading || loading || !user || (user.role !== 'Admin' && user.role !== 'Project Manager')) {
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
                      <EditPlanningDialog project={project} onActionComplete={fetchProjects} />
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-end">
                    <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
);
