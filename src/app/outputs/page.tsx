'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { format } from "date-fns";

// Actions, Schemas, Hooks
import { useAuth, type AuthUser } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { addProjectOutput, deleteProjectOutput } from '@/lib/actions/project.actions';
import { AddProjectOutputInputSchema, type ProjectOutput, type AddProjectOutputInput } from '@/lib/schemas';

// Firebase
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Icons
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";


// --- DATA INTERFACES ---
interface ProjectWithOutputs {
  id: string;
  title: string;
  status: string;
  team: string[];
  outputs: ProjectOutput[];
}

// --- CONSTANTS ---
const commonUnits = ['kg', 'liters', 'units', 'bales', 'tons', 'crates', 'bunches'];

// --- UPDATE OUTPUT DIALOG ---
function UpdateOutputDialog({ project, user, onActionComplete }: { project: ProjectWithOutputs, user: AuthUser, onActionComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm<AddProjectOutputInput>({
    resolver: zodResolver(AddProjectOutputInputSchema),
    defaultValues: {
      projectId: project.id,
      description: '',
      quantity: 0,
      unit: 'kg',
    },
  });

  const onSubmit = async (values: AddProjectOutputInput) => {
    const result = await addProjectOutput(values, user.displayName);
    if (result.success) {
      toast({ title: 'Output Logged Successfully' });
      form.reset({
        ...form.getValues(),
        description: '',
        quantity: 0,
      });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Failed to Log Output', description: result.error });
    }
  };

  const handleDelete = async (outputId: string) => {
    setIsDeleting(outputId);
    const result = await deleteProjectOutput({ projectId: project.id, outputId }, user.displayName);
    if (result.success) {
      toast({ title: 'Output Record Deleted' });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
    }
    setIsDeleting(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Update Output</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Log Output for: {project.title}</DialogTitle>
          <DialogDescription>
            Add new production or harvest records. Existing records are shown below.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-6">
            {/* Add New Output Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 border rounded-lg space-y-4">
                <h4 className="font-medium">Add New Record</h4>
                 <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="e.g., Harvested Wheat, Batch A" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 500" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            {commonUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}/>
                </div>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Log Output
                </Button>
              </form>
            </Form>

            <Separator />

            {/* Existing Outputs List */}
            <div className="space-y-3">
                <h4 className="font-medium">Logged Outputs</h4>
                {project.outputs && project.outputs.length > 0 ? (
                    <div className="space-y-2">
                        {project.outputs
                            .sort((a,b) => b.date.getTime() - a.date.getTime())
                            .map(output => (
                            <div key={output.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                                <div>
                                    <p className="font-medium">{output.quantity} {output.unit} of {output.description}</p>
                                    <p className="text-xs text-muted-foreground">Logged on {format(output.date, 'PP')}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(output.id)} disabled={isDeleting === output.id}>
                                    {isDeleting === output.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No outputs have been logged for this project yet.</p>
                )}
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
export default function OutputsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithOutputs[]>([]);
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
      const pQuery = query(projectsRef, where('companyId', '==', companyId));
      const projectsSnap = await getDocs(pQuery);
      
      const projectsData = projectsSnap.docs.map(doc => {
          const data = doc.data();
          const outputs = (data.outputs || []).map((o: any) => ({
                ...o,
                date: o.date?.toDate(), // Safely convert timestamp
          })).filter((o: ProjectOutput) => o.date);
          return {
              id: doc.id,
              title: data.title,
              status: data.status,
              team: data.team,
              outputs: outputs,
          }
      }) as ProjectWithOutputs[];
      
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setProjects([]);
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
    return <OutputsSkeleton />;
  }

  return (
    <div>
       <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Project Outputs</h1>
        <p className="text-muted-foreground">
          Log and view production records for each project.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Output Dashboard</CardTitle>
          <CardDescription>Select a project to log or view its outputs.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outputs Logged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                    const canUpdate = user.role === 'Admin' || user.role === 'Project Manager' || project.team.includes(user.uid);
                    return (
                        <TableRow key={project.id}>
                            <TableCell>
                            <div className="font-medium">{project.title}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{project.status}</Badge>
                            </TableCell>
                            <TableCell>
                                {project.outputs?.length || 0} records
                            </TableCell>
                            <TableCell className="text-right">
                            {canUpdate ? (
                                <UpdateOutputDialog 
                                    project={project}
                                    user={user}
                                    onActionComplete={fetchData}
                                />
                            ) : (
                                <Button size="sm" disabled>Update Output</Button>
                            )}
                            </TableCell>
                        </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center">
              <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Projects Found</h2>
              <p className="text-muted-foreground">
                Create a project on the 'Projects' page to begin logging outputs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- SKELETON COMPONENT ---
const OutputsSkeleton = () => (
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
              <div key={i} className="grid grid-cols-4 gap-4 items-center p-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-end">
                    <Skeleton className="h-9 w-28" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
);
