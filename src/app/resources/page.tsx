
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Tractor, Droplets, DollarSign, Warehouse, PlusCircle, Loader2, Pencil, Car } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createResource, updateResource } from '@/lib/actions/resource.actions';
import { CreateResourceInputSchema, UpdateResourceInputSchema } from '@/lib/schemas';
import type { CreateResourceInput, UpdateResourceInput } from '@/lib/schemas';


// --- DATA INTERFACE ---
interface Resource {
    id: string;
    name: string;
    category: "Inputs" | "Equipment" | "Infrastructure" | "Finance" | "Vehicles" | "Other" | string;
    quantity: number;
    status: string;
    unit: string;
    minStock?: number;
}

// --- CONSTANTS & HELPERS ---
const statusBadgeVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  "In Stock": "default", "Good": "default", "In Use": "default", "On Track": "default",
  "Low Stock": "destructive", "Needs Maintenance": "destructive", "Out of Stock": "destructive",
};

const categoryIcons: { [key: string]: React.ReactNode } = {
  "Inputs": <Package className="h-4 w-4 text-muted-foreground" />,
  "Equipment": <Tractor className="h-4 w-4 text-muted-foreground" />,
  "Vehicles": <Car className="h-4 w-4 text-muted-foreground" />,
  "Infrastructure": <Droplets className="h-4 w-4 text-muted-foreground" />,
  "Finance": <DollarSign className="h-4 w-4 text-muted-foreground" />,
  "Other": <Warehouse className="h-4 w-4 text-muted-foreground" />,
};

const resourceCategories: Resource['category'][] = ["Inputs", "Equipment", "Vehicles", "Infrastructure", "Finance", "Other"];
const resourceStatuses = ["In Stock", "Good", "In Use", "On Track", "Low Stock", "Needs Maintenance", "Out of Stock"];


// --- ADD/EDIT DIALOG HELPER ---
function getDynamicLabels(category: string) {
    switch (category) {
        case 'Inputs': return { quantityLabel: 'Quantity', unit: 'kg' };
        case 'Finance': return { quantityLabel: 'Amount', unit: 'XAF' };
        default: return { quantityLabel: 'Quantity', unit: 'units' };
    }
}

// --- ADD RESOURCE DIALOG ---
function AddResourceDialog({ companyId, actorName, onResourceAdded }: { companyId: string, actorName: string, onResourceAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateResourceInput>({
    resolver: zodResolver(CreateResourceInputSchema),
    defaultValues: {
      name: "",
      category: "Inputs",
      quantity: 0,
      unit: 'kg',
      minStock: 0,
      status: "In Stock",
      companyId: companyId,
    },
  });

  const category = form.watch('category');
  const { quantityLabel, unit: defaultUnit } = getDynamicLabels(category);

  useEffect(() => {
    form.setValue('unit', defaultUnit);
  }, [category, defaultUnit, form.setValue]);


  const onSubmit = async (values: CreateResourceInput) => {
    const result = await createResource(values, actorName);
    if (result.success) {
      toast({
        title: "Resource Added",
        description: `"${values.name}" has been successfully added to your inventory.`,
      });
      form.reset();
      setOpen(false);
      onResourceAdded();
    } else {
      toast({
        variant: "destructive",
        title: "Addition Failed",
        description: result.error || "An unexpected error occurred.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Add New Resource</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new resource to your inventory.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Resource Name</FormLabel>
                <FormControl><Input placeholder="e.g., Organic Fertilizer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        {resourceCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        {resourceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{quantityLabel}</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl><Input placeholder="e.g., kg, units, XAF" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
            </div>

            {category === 'Inputs' && (
                <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem>
                    <FormLabel>Minimum Stock for Alert</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
            )}

            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Resource
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- EDIT RESOURCE DIALOG ---
function EditResourceDialog({ resource, actorName, onResourceUpdated }: { resource: Resource, actorName: string, onResourceUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<UpdateResourceInput>({
    resolver: zodResolver(UpdateResourceInputSchema),
    defaultValues: {
      id: resource.id,
      name: resource.name,
      category: resource.category,
      quantity: resource.quantity,
      unit: resource.unit,
      minStock: resource.minStock || 0,
      status: resource.status,
    },
  });

  const category = form.watch('category');
  const { quantityLabel, unit: defaultUnit } = getDynamicLabels(category);
  
  useEffect(() => {
    // Only update the unit if the category changes to a different type (e.g. from Input to Finance)
    // This avoids overwriting a custom unit if the user just re-selects the same category.
    const currentUnit = form.getValues('unit');
    if (currentUnit !== defaultUnit) {
        form.setValue('unit', defaultUnit);
    }
  }, [category, defaultUnit, form]);

  const onSubmit = async (values: UpdateResourceInput) => {
    const result = await updateResource(values, actorName);
    if (result.success) {
      toast({
        title: "Resource Updated",
        description: `"${values.name}" has been successfully updated.`,
      });
      setOpen(false);
      onResourceUpdated();
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
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Resource</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Resource</DialogTitle>
          <DialogDescription>
            Update the details for "{resource.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Resource Name</FormLabel>
                <FormControl><Input placeholder="e.g., Organic Fertilizer" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        {resourceCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        {resourceStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{quantityLabel}</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 50" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl><Input placeholder="e.g., kg, units, XAF" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
            </div>

            {category === 'Inputs' && (
                <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem>
                    <FormLabel>Minimum Stock for Alert</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
            )}
            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// --- MAIN COMPONENT ---
export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const resourcesRef = collection(db, 'resources');
      const q = query(resourcesRef, where('companyId', '==', user.companyId));
      const querySnapshot = await getDocs(q);
      
      const resourcesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Resource[];
      
      setResources(resourcesData);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (loading) {
    return <ResourcesSkeleton />;
  }

  return (
    <div>
       <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-headline text-foreground">Resource Management</h1>
          <p className="text-muted-foreground">
            Track and manage your cooperative's assets.
          </p>
        </div>
        {user && (user.role === 'Admin' || user.role === 'Project Manager') && (
            <AddResourceDialog companyId={user.companyId} actorName={user.displayName} onResourceAdded={fetchResources} />
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Inventory</CardTitle>
          <CardDescription>A complete list of all tracked resources.</CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount / Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  {user?.role === 'Admin' && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {categoryIcons[resource.category] || <Warehouse className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{resource.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{resource.category}</TableCell>
                    <TableCell>{resource.quantity} {resource.unit}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[resource.status] || "outline"}>
                        {resource.status}
                      </Badge>
                    </TableCell>
                    {user?.role === 'Admin' && (
                        <TableCell className="text-right">
                            <EditResourceDialog resource={resource} actorName={user.displayName} onResourceUpdated={fetchResources} />
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center">
              <Warehouse className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Resources Found</h2>
              <p className="text-muted-foreground">
                Your inventory is empty. Click "Add Resource" to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


// --- SKELETON COMPONENT ---
const ResourcesSkeleton = () => (
   <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Resource Management</h1>
        <p className="text-muted-foreground">
          Track and manage your cooperative's assets.
        </p>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
);
