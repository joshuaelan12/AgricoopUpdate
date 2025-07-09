
'use client';

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, doc } from 'firebase/firestore';
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useIsMobile } from "@/hooks/use-mobile";


import { createProject, addProjectComment, deleteProjectComment, updateProject, deleteProject, addTaskToProject, updateTask, deleteTask, addFileToProject, deleteFileFromProject, addFileToTask, deleteFileFromTask, allocateMultipleResourcesToProject, deallocateResourceFromProject } from "@/lib/actions/project.actions";
import { CreateProjectInputSchema, UpdateProjectInputSchema, AddProjectCommentInputSchema, AddTaskInputSchema, UpdateTaskInputSchema, AddFileToProjectInputSchema, AddFileToTaskInputSchema, AllocateMultipleResourcesInputSchema } from "@/lib/schemas";
import type { Project, Task, UserData, Comment, AddProjectCommentInput, UpdateProjectInput, AddTaskInput, UpdateTaskInput, ProjectFile, AllocatedResource } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { FolderKanban, PlusCircle, Users as UsersIcon, Loader2, MessageSquare, Trash2, MoreVertical, Edit, CalendarIcon, Check, GripVertical, Grip, ChevronDown, ListTodo, Paperclip, UploadCloud, File as FileIcon, Download, Package } from "lucide-react";

// --- HELPER FUNCTIONS & CONSTANTS ---
const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const statusColors: { [key: string]: string } = {
  "In Progress": "bg-blue-500",
  "On Hold": "bg-yellow-500",
  "Completed": "bg-green-600",
  "Planning": "bg-gray-500",
  "Delayed": "bg-red-500",
};

const projectStatuses: Project['status'][] = ["Planning", "In Progress", "On Hold", "Delayed", "Completed"];
const priorities: Project['priority'][] = ['Low', 'Medium', 'High'];
const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Completed'];

const currencyFormatter = new Intl.NumberFormat('fr-CM', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
});

interface Resource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    status: string;
    unit: string;
}

// --- SKELETON COMPONENT ---
const ProjectCardSkeleton = () => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full mt-2" />
      <Skeleton className="h-4 w-2/3 mt-1" />
    </CardHeader>
    <CardContent className="flex-grow">
      <div>
        <Skeleton className="h-4 w-1/4 mb-1" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-3 w-1/4 mt-1" />
      </div>
    </CardContent>
    <CardFooter>
      <div className="flex items-center justify-between w-full">
        <Skeleton className="h-4 w-12" />
        <div className="flex -space-x-2">
          <Skeleton className="h-8 w-8 rounded-full border-2 border-card" />
          <Skeleton className="h-8 w-8 rounded-full border-2 border-card" />
        </div>
      </div>
    </CardFooter>
  </Card>
);

// --- CREATE PROJECT DIALOG ---
function CreateProjectDialog({ actor, onActionComplete, isMobile }: { actor: { uid: string, displayName: string, companyId: string }, onActionComplete: () => void, isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const form = useForm<z.infer<typeof CreateProjectInputSchema>>({
    resolver: zodResolver(CreateProjectInputSchema),
    defaultValues: {
      title: "",
      description: "",
      expectedOutcome: "",
      status: "Planning",
      companyId: actor.companyId,
      priority: 'Medium',
      deadline: null,
      estimatedBudget: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateProjectInputSchema>) => {
    const result = await createProject(values, actor.displayName);
    if (result.success) {
      toast({
        title: "Project Created",
        description: `"${values.title}" has been successfully created.`,
      });
      form.reset();
      setOpen(false);
      onActionComplete();
    } else {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: result.error || "An unexpected error occurred.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Create a New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new project for your company.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Project Title</FormLabel><FormControl><Input placeholder="e.g., Spring Planting Initiative" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the project's goals and scope." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="expectedOutcome" render={({ field }) => (
                <FormItem><FormLabel>Expected Outcome</FormLabel><FormControl><Textarea placeholder="Describe the desired results or deliverables of the project." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deadline" render={({ field }) => {
                    const handleDateSelect = (date: Date | undefined) => {
                        field.onChange(date);
                        setDatePickerOpen(false);
                    };
                    return (
                        <FormItem className="flex flex-col">
                            <FormLabel>Deadline</FormLabel>
                            {isMobile ? (
                                <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <DialogTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </DialogTrigger>
                                    <DialogContent className="w-auto">
                                        <DialogTitle className="sr-only">Pick a date</DialogTitle>
                                        <DialogDescription className="sr-only">Select a deadline for the project.</DialogDescription>
                                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            )}
                            <FormMessage />
                        </FormItem>
                    );
                }}/>
              <FormField control={form.control} name="estimatedBudget" render={({ field }) => (
                <FormItem><FormLabel>Est. Budget (XAF)</FormLabel><FormControl><Input type="number" placeholder="500000" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
             </div>
            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// --- TASK MANAGEMENT DIALOGS ---
function AddOrEditTaskDialog({ mode, project, task, users, actor, onActionComplete, isMobile }: { mode: 'add' | 'edit', project: Project, task?: Task, users: UserData[], actor: { uid: string, displayName: string, role: string }, onActionComplete: () => void, isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { toast } = useToast();
  const isEdit = mode === 'edit';

  const formSchema = isEdit ? UpdateTaskInputSchema : AddTaskInputSchema;
  type FormSchemaType = z.infer<typeof formSchema>;

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit && task ? {
        projectId: project.id,
        taskId: task.id,
        title: task.title,
        expectedOutcome: task.expectedOutcome || "",
        assignedTo: task.assignedTo,
        deadline: task.deadline ? new Date(task.deadline) : null,
        status: task.status,
    } : {
        projectId: project.id,
        title: "",
        expectedOutcome: "",
        assignedTo: [],
        deadline: null,
    },
  });

  const onSubmit = async (values: FormSchemaType) => {
    // Ensure deadline is either a Date or null, not undefined
    const deadline = values.deadline === undefined ? null : values.deadline;

    const result = isEdit 
      ? await updateTask(values as UpdateTaskInput, actor) 
      : await addTaskToProject({ ...values, deadline }, actor);
      
    if (result.success) {
      toast({ title: `Task ${isEdit ? 'Updated' : 'Added'}` });
      form.reset();
      setOpen(false);
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Action Failed", description: result.error });
    }
  };

  const triggerButton = isEdit ? (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
      <Edit className="mr-2 h-4 w-4" /> Edit Task
    </DropdownMenuItem>
  ) : (
    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" />Add Task</Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{isEdit ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          <DialogDescription>For project: {project.title}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input placeholder="e.g., Prepare soil for planting" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="expectedOutcome" render={({ field }) => (
                <FormItem><FormLabel>Expected Outcome</FormLabel><FormControl><Textarea placeholder="Describe the desired result of this task." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="assignedTo" render={({ field }) => (
                <FormItem><FormLabel>Assign To</FormLabel><DropdownMenu><DropdownMenuTrigger asChild><FormControl><Button variant="outline" className="w-full justify-between">{field.value?.length > 0 ? `${field.value.length} selected` : "Select members"}<ChevronDown className="h-4 w-4 opacity-50" /></Button></FormControl></DropdownMenuTrigger><DropdownMenuContent className="w-56"><DropdownMenuLabel>Available Members</DropdownMenuLabel><DropdownMenuSeparator />{users.map(user => (<DropdownMenuCheckboxItem key={user.uid} checked={field.value?.includes(user.uid)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), user.uid]) : field.onChange(field.value?.filter(id => id !== user.uid))}}>{user.displayName}</DropdownMenuCheckboxItem>))}</DropdownMenuContent></DropdownMenu><FormMessage /></FormItem>
               )}/>
               <FormField control={form.control} name="deadline" render={({ field }) => {
                  const handleDateSelect = (date: Date | undefined) => {
                      field.onChange(date);
                      setDatePickerOpen(false);
                  };
                  return (
                    <FormItem className="flex flex-col">
                        <FormLabel>Deadline</FormLabel>
                        {isMobile ? (
                            <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                <DialogTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </DialogTrigger>
                                <DialogContent className="w-auto">
                                    <DialogTitle className="sr-only">Pick a date</DialogTitle>
                                    <DialogDescription className="sr-only">Select a deadline for the task.</DialogDescription>
                                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} disabled={(date) => date < new Date("1900-01-01")} initialFocus />
                                </PopoverContent>
                            </Popover>
                        )}
                        <FormMessage />
                    </FormItem>
                  );
                }}/>
             </div>
             {isEdit && (
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
             )}
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEdit ? 'Save Changes' : 'Add Task'}</Button>
             </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- FILE MANAGER COMPONENT ---
function FileManager({
  projectId,
  taskId,
  files,
  canUpload,
  canDelete,
  actor,
  onActionComplete,
}: {
  projectId: string;
  taskId?: string;
  files: ProjectFile[];
  canUpload: boolean;
  canDelete: boolean;
  actor: { uid: string, displayName: string };
  onActionComplete: () => void;
}) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !storage || !db) return;

    setIsUploading(true);
    setUploadProgress(0);

    const fileId = doc(collection(db, 'projects')).id; // Generate a unique ID
    const filePath = taskId
      ? `projects/${projectId}/tasks/${taskId}/${fileId}-${selectedFile.name}`
      : `projects/${projectId}/${fileId}-${selectedFile.name}`;
    const storageRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const fileData = { id: fileId, name: selectedFile.name, url: downloadURL };
        
        const cleanActor = { uid: actor.uid, displayName: actor.displayName };
        const result = taskId
          ? await addFileToTask({ projectId, taskId, file: fileData, uploaderName: cleanActor.displayName }, cleanActor.displayName)
          : await addFileToProject({ projectId, file: fileData, uploaderName: cleanActor.displayName }, cleanActor.displayName);
        
        if (result.success) {
          toast({ title: "File Uploaded" });
          onActionComplete();
        } else {
          toast({ variant: "destructive", title: "Failed to save file reference", description: result.error });
        }

        setSelectedFile(null);
        setIsUploading(false);
      }
    );
  };
  
  const handleDelete = async (file: ProjectFile) => {
      setDeletingFileId(file.id);
      const cleanActor = { uid: actor.uid, displayName: actor.displayName };
      const result = taskId
        ? await deleteFileFromTask({ projectId, taskId, fileId: file.id }, cleanActor.displayName)
        : await deleteFileFromProject({ projectId, fileId: file.id }, cleanActor.displayName);

      if (result.success) {
          toast({ title: "File Deleted" });
          onActionComplete();
      } else {
          toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
      }
      setDeletingFileId(null);
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
          <h4 className="font-medium">Upload a new file</h4>
          <Input type="file" onChange={handleFileChange} disabled={isUploading} />
          {isUploading && <Progress value={uploadProgress} className="h-2" />}
          {selectedFile && !isUploading && (
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
                <Button onClick={handleUpload} size="sm"><UploadCloud className="mr-2 h-4 w-4" />Upload</Button>
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="font-medium mb-2">Attached Files</h4>
        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{file.name}</a>
                        <p className="text-xs text-muted-foreground">Uploaded by {file.uploaderName} on {format(file.uploadedAt, 'PP')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" className="h-8 w-8">
                        <a href={file.url} target="_blank" download><Download className="h-4 w-4" /></a>
                    </Button>
                    {canDelete && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={deletingFileId === file.id}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><DialogTitle>Are you sure?</DialogTitle><AlertDialogDescription>This will permanently delete the file.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(file)}>{deletingFileId === file.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No files have been attached yet.</p>
        )}
      </div>
    </div>
  );
}


// --- RESOURCE MANAGEMENT TAB ---
function ResourceManagementTab({ project, allResources, actor, onActionComplete }: { project: Project; allResources: Resource[]; actor: { uid: string; displayName: string; }; onActionComplete: () => void; }) {
  const { toast } = useToast();
  const [isDeallocating, setIsDeallocating] = useState<string | null>(null);

  const form = useForm<{ allocations: { resourceId: string; quantity: number }[] }>({
    resolver: zodResolver(AllocateMultipleResourcesInputSchema.pick({ allocations: true })),
    defaultValues: {
      allocations: [{ resourceId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'allocations'
  });

  const availableResources = useMemo(() => {
    const allocatedIds = new Set(project.allocatedResources.map(r => r.resourceId));
    return allResources.filter(r => !allocatedIds.has(r.id));
  }, [allResources, project.allocatedResources]);

  const onAllocateSubmit = async (values: { allocations: { resourceId: string; quantity: number }[] }) => {
    const result = await allocateMultipleResourcesToProject({ projectId: project.id, allocations: values.allocations }, actor.displayName);
    if (result.success) {
      toast({ title: "Resources Allocated" });
      form.reset({ allocations: [{ resourceId: '', quantity: 1 }] });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Allocation Failed', description: result.error });
    }
  };
  
  const handleDeallocate = async (resourceId: string) => {
    setIsDeallocating(resourceId);
    const result = await deallocateResourceFromProject({ projectId: project.id, resourceId }, actor.displayName);
    if (result.success) {
      toast({ title: 'Resource Deallocated' });
      onActionComplete();
    } else {
      toast({ variant: 'destructive', title: 'Deallocation Failed', description: result.error });
    }
    setIsDeallocating(null);
  };
  
  return (
    <Card className="mt-2 border-0 shadow-none">
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-headline">Resource Allocation</CardTitle>
        <CardDescription>Allocate resources from your inventory to this project.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAllocateSubmit)} className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <h4 className="font-medium">Allocate New Resources</h4>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`allocations.${index}.resourceId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(index !== 0 && "sr-only")}>Resource</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a resource" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {availableResources.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.name} ({r.quantity} {r.unit} available)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`allocations.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={cn(index !== 0 && "sr-only")}>Quantity</FormLabel>
                        <FormControl><Input type="number" {...field} className="w-24" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Remove resource</span>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4">
                <Button type="button" variant="outline" size="sm" onClick={() => append({ resourceId: '', quantity: 1 })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Resource
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Allocate Selected'}
                </Button>
            </div>
          </form>
        </Form>

        <div>
          <h4 className="font-medium mb-2">Allocated Resources</h4>
          {project.allocatedResources.length > 0 ? (
            <div className="space-y-2">
              {project.allocatedResources.map(resource => (
                <div key={resource.resourceId} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">{resource.quantity} {resource.unit}</p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeallocating === resource.resourceId}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will deallocate the resource and return it to your main inventory.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeallocate(resource.resourceId)}>{isDeallocating === resource.resourceId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Deallocate'}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No resources allocated to this project.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


// --- PROJECT DETAILS DIALOG ---
function ProjectDetailsDialog({ project, users, resources, currentUser, onActionComplete, isMobile }: { project: Project, users: { [uid: string]: UserData }, resources: Resource[], currentUser: {uid: string, displayName: string, role: string}, onActionComplete: () => void, isMobile: boolean }) {
  const { toast } = useToast();
  const [isDeletingTask, setIsDeletingTask] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  const isManager = currentUser.role === 'Admin' || currentUser.role === 'Project Manager';
  const cleanActor = { uid: currentUser.uid, displayName: currentUser.displayName, role: currentUser.role };


  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const result = await updateTask({ projectId: project.id, taskId, status: newStatus }, cleanActor);
    if (result.success) {
      toast({ title: "Task Status Updated" });
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsDeletingTask(taskId);
    const result = await deleteTask({ projectId: project.id, taskId }, currentUser.displayName);
     if (result.success) {
      toast({ title: "Task Deleted" });
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
    }
    setIsDeletingTask(null);
  }

  const handleAddComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      setIsSubmittingComment(true);
      const input: AddProjectCommentInput = { projectId: project.id, commentText: newComment, userId: currentUser.uid, userName: currentUser.displayName };
      const result = await addProjectComment(input);
      if (result.success) {
          setNewComment('');
          toast({ title: "Comment Added" });
          onActionComplete();
      } else {
          toast({ variant: "destructive", title: "Failed to post comment", description: result.error });
      }
      setIsSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    setIsDeletingComment(commentId);
    const result = await deleteProjectComment({ projectId: project.id, commentId, userId: currentUser.uid });
    if (result.success) {
      toast({ title: "Comment Deleted" });
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Failed to delete comment", description: result.error });
    }
    setIsDeletingComment(null);
  };

  const sortedComments = useMemo(() => {
    return (project.comments || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [project.comments]);

  const sortedProjectFiles = useMemo(() => {
    return (project.files || []).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [project.files]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="font-headline text-3xl">{project.title}</DialogTitle>
              <DialogDescription className="mt-1">{project.description}</DialogDescription>
              {project.expectedOutcome && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-foreground">Expected Outcome</h4>
                  <p className="text-sm text-muted-foreground">{project.expectedOutcome}</p>
                </div>
              )}
            </div>
             <ProjectActions project={project} actorName={currentUser.displayName} onActionComplete={onActionComplete} isMobile={isMobile} />
          </div>
          <div className="flex items-center gap-4 pt-2 text-sm">
            <Badge className={`${statusColors[project.status]} text-primary-foreground`}>{project.status}</Badge>
            {project.deadline && <span>Deadline: {format(project.deadline, 'PP')}</span>}
            {project.estimatedBudget && <span>Budget: {currencyFormatter.format(project.estimatedBudget)}</span>}
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="tasks" className="flex-grow flex flex-col min-h-0">
          <TabsList className="mt-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks" className="flex-grow overflow-y-auto mt-0 -mr-6 pr-6">
              <Card className="mt-2 border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div>
                        <CardTitle className="text-xl font-headline">Task List</CardTitle>
                        <CardDescription>Track and manage all tasks for this project.</CardDescription>
                    </div>
                    {isManager && <AddOrEditTaskDialog mode="add" project={project} users={Object.values(users)} actor={cleanActor} onActionComplete={onActionComplete} isMobile={isMobile} />}
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {project.tasks?.length > 0 ? (
                        project.tasks.map(task => {
                            const canUpdateTask = isManager || task.assignedTo.includes(currentUser.uid);
                            return (
                                <Card key={task.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-grow">
                                        <p className="font-medium">{task.title}</p>
                                        <div className="flex items-center gap-x-3 text-xs text-muted-foreground mt-1">
                                            {task.deadline && <span>Due: {format(task.deadline, 'PP')}</span>}
                                            {task.assignedTo.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <UsersIcon className="h-3 w-3" />
                                                    {task.assignedTo.map(uid => users[uid]?.displayName).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        {task.expectedOutcome && (
                                            <div className="mt-2 text-sm text-muted-foreground border-l-2 pl-2">
                                                {task.expectedOutcome}
                                            </div>
                                        )}
                                    </div>
                                     <div className="flex items-center gap-2 flex-shrink-0">
                                        <Select value={task.status} onValueChange={(newStatus: Task['status']) => handleTaskStatusChange(task.id, newStatus)} disabled={!canUpdateTask}>
                                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent><>{taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</>
                                            </SelectContent>
                                        </Select>
                                        {isManager && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <AddOrEditTaskDialog mode="edit" project={project} task={task} users={Object.values(users)} actor={cleanActor} onActionComplete={onActionComplete} isMobile={isMobile} />
                                                    <DropdownMenuSeparator />
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Task</DropdownMenuItem></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this task.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTask(task.id)} disabled={isDeletingTask === task.id}>{isDeletingTask === task.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                     </div>
                                </div>
                                <Separator className="my-4" />
                                <FileManager
                                    projectId={project.id}
                                    taskId={task.id}
                                    files={task.files || []}
                                    canUpload={canUpdateTask}
                                    canDelete={isManager}
                                    actor={cleanActor}
                                    onActionComplete={onActionComplete}
                                />
                                </Card>
                            )
                        })
                    ) : (
                        <div className="text-center text-muted-foreground py-8"><ListTodo className="mx-auto h-12 w-12 mb-2" /><p>No tasks have been added yet.</p></div>
                    )}
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="resources" className="flex-grow overflow-y-auto mt-0 -mr-6 pr-6">
            {isManager ? (
              <ResourceManagementTab 
                project={project}
                allResources={resources}
                actor={cleanActor}
                onActionComplete={onActionComplete}
              />
            ) : (
               <Card className="mt-2 border-0 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-muted-foreground text-center py-8">Resource allocation can only be managed by Admins or Project Managers.</p>
                  </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="files" className="flex-grow overflow-y-auto mt-0 -mr-6 pr-6">
            <Card className="mt-2 border-0 shadow-none">
                <CardHeader className="p-4">
                    <CardTitle className="text-xl font-headline">Project Documents</CardTitle>
                    <CardDescription>Manage files and documents related to the entire project.</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    <FileManager 
                        projectId={project.id}
                        files={sortedProjectFiles}
                        canUpload={isManager}
                        canDelete={isManager}
                        actor={cleanActor}
                        onActionComplete={onActionComplete}
                    />
                </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comments" className="flex-grow overflow-y-auto mt-0 -mr-6 pr-6">
             <Card className="mt-2 border-0 shadow-none">
                <CardHeader className="p-4">
                    <CardTitle className="text-xl font-headline">Comments</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                     <div className="space-y-4 pr-2 mb-4">
                      {sortedComments.length > 0 ? (
                        sortedComments.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 border"><AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback></Avatar>
                              <div className="w-full bg-muted/50 p-2 rounded-md">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{comment.authorName}</p>
                                   {currentUser.uid === comment.authorId && (
                                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this comment.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteComment(comment.id)} disabled={isDeletingComment === comment.id}>{isDeletingComment === comment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/80">{comment.text}</p>
                              </div>
                            </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                      )}
                    </div>
                     <form onSubmit={handleAddComment} className="flex items-start gap-2 pt-4 border-t">
                        <Avatar className="h-9 w-9 border"><AvatarFallback>{getInitials(currentUser?.displayName)}</AvatarFallback></Avatar>
                        <div className="w-full">
                          <Textarea placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[40px] bg-background" />
                          <Button type="submit" size="sm" className="mt-2" disabled={isSubmittingComment || !newComment.trim()}>
                            {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                          </Button>
                        </div>
                      </form>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


// --- EDIT/DELETE PROJECT ACTIONS ---
function ProjectActions({ project, actorName, onActionComplete, isMobile }: { project: Project; actorName: string; onActionComplete: () => void; isMobile: boolean; }) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProject({ projectId: project.id }, actorName);
    if (result.success) {
      toast({ title: "Project Deleted" });
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
    }
    setIsDeleting(false);
  };
  
   const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(UpdateProjectInputSchema),
    defaultValues: {
      projectId: project.id,
      title: project.title,
      description: project.description,
      expectedOutcome: project.expectedOutcome || "",
      status: project.status,
      priority: project.priority || 'Medium',
      deadline: project.deadline ? new Date(project.deadline) : null,
      estimatedBudget: project.estimatedBudget || 0,
    },
  });

  const onEditSubmit = async (values: UpdateProjectInput) => {
    const result = await updateProject(values, actorName);
    if (result.success) {
      toast({ title: "Project Updated" });
      setIsEditOpen(false);
      onActionComplete();
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error });
    }
  };


  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical className="h-4 w-4" /><span className="sr-only">More options</span></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4" /><span>Edit Project</span></DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete Project</span></DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the project and all associated data.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
    
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle className="font-headline text-2xl">Edit Project</DialogTitle><DialogDescription>Make changes to your project here. Click save when you're done.</DialogDescription></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="expectedOutcome" render={({ field }) => (
                <FormItem><FormLabel>Expected Outcome</FormLabel><FormControl><Textarea placeholder="Describe the desired results or deliverables of the project." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{projectStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deadline" render={({ field }) => {
                    const handleDateSelect = (date: Date | undefined) => {
                        field.onChange(date);
                        setDatePickerOpen(false);
                    };
                    return (
                        <FormItem className="flex flex-col">
                            <FormLabel>Deadline</FormLabel>
                            {isMobile ? (
                                <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <DialogTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </DialogTrigger>
                                    <DialogContent className="w-auto">
                                        <DialogTitle className="sr-only">Pick a date</DialogTitle>
                                        <DialogDescription className="sr-only">Select a deadline for the project.</DialogDescription>
                                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} initialFocus />
                                    </DialogContent>
                                </Dialog>
                            ) : (
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={handleDateSelect} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            )}
                            <FormMessage />
                        </FormItem>
                    );
                }}/>
              <FormField control={form.control} name="estimatedBudget" render={({ field }) => (
                <FormItem><FormLabel>Est. Budget (XAF)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
             </div>
            <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}


// --- MAIN PAGE COMPONENT ---
export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: UserData }>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const fetchData = async () => {
      if (!user?.companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { companyId } = user;
        const projectsRef = collection(db, 'projects');
        const usersRef = collection(db, 'users');
        const resourcesRef = collection(db, 'resources');

        const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
        const usersQuery = query(usersRef, where('companyId', '==', companyId));
        const resourcesQuery = query(resourcesRef, where('companyId', '==', companyId));

        const [projectsSnap, usersSnap, resourcesSnap] = await Promise.all([ 
          getDocs(projectsQuery), 
          getDocs(usersQuery),
          getDocs(resourcesQuery),
        ]);

        const projectsData = projectsSnap.docs.map(doc => {
            const data = doc.data();

            // Helper to safely convert Firestore Timestamps to JS Dates
            const toDate = (timestamp: any): Date | null => {
                if (!timestamp) return null;
                // Handle both Timestamp objects and already-converted Date strings
                if (timestamp.toDate) return timestamp.toDate();
                if (typeof timestamp === 'string' || timestamp instanceof Date) return new Date(timestamp);
                return null;
            };

            // Helper for required dates, providing a fallback to prevent crashes
            const toDateRequired = (timestamp: any): Date => {
                const date = toDate(timestamp);
                return date || new Date(); // Fallback to now if conversion fails
            };
            
            const comments: Comment[] = (data.comments || []).map((c: any) => ({
                ...c,
                createdAt: toDateRequired(c.createdAt),
            }));
            
            const files: ProjectFile[] = (data.files || []).map((f: any) => ({
                ...f,
                uploadedAt: toDateRequired(f.uploadedAt),
            }));
            
            const tasks: Task[] = (data.tasks || []).map((t: any) => ({
                ...t,
                expectedOutcome: t.expectedOutcome || "",
                deadline: toDate(t.deadline),
                files: (t.files || []).map((f: any) => ({
                    ...f,
                    uploadedAt: toDateRequired(f.uploadedAt),
                })),
                assignedTo: t.assignedTo || [],
            }));
            
            return {
                id: doc.id,
                ...data,
                expectedOutcome: data.expectedOutcome || "",
                deadline: toDate(data.deadline),
                comments,
                files,
                tasks,
                allocatedResources: data.allocatedResources || [],
            } as Project;
        });
        
        const usersData = usersSnap.docs.reduce((acc, doc) => {
          acc[doc.id] = { uid: doc.id, ...(doc.data() as Omit<UserData, 'uid'>) };
          return acc;
        }, {} as { [uid: string]: UserData });

        const resourcesData = resourcesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];

        setProjects(projectsData);
        setUsers(usersData);
        setResources(resourcesData);
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };
  
  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-headline text-foreground">Projects</h1>
          <p className="text-muted-foreground">Browse and manage all projects within your cooperative.</p>
        </div>
         {user && (user.role === 'Admin' || user.role === 'Project Manager') && !loading && (
          <CreateProjectDialog actor={{uid: user.uid, displayName: user.displayName, companyId: user.companyId}} onActionComplete={fetchData} isMobile={isMobile} />
        )}
      </div>

      {loading && (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)}</div>)}

      {!loading && projects.length === 0 && (
         <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" /><h2 className="text-2xl font-headline">No Projects Yet</h2><p className="text-muted-foreground">Get started by creating your first project.</p>
            </CardContent>
          </Card>
      )}

      {!loading && projects.length > 0 && user && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
              <Card key={project.id} id={project.id} className="flex flex-col scroll-mt-24">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                      <CardTitle className="font-headline text-2xl flex-1">{project.title}</CardTitle>
                      <Badge className={`${statusColors[project.status]} text-primary-foreground`}>{project.status}</Badge>
                  </div>
                  <CardDescription className="pt-2 line-clamp-2">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-medium text-muted-foreground">Team</span>
                        <div className="flex -space-x-2">
                        {project.team.slice(0, 5).map((uid) => (
                            <Avatar key={uid} className="h-8 w-8 border-2 border-card"><AvatarFallback>{getInitials(users[uid]?.displayName)}</AvatarFallback></Avatar>
                        ))}
                        {project.team.length > 5 && <Avatar className="h-8 w-8 border-2 border-card"><AvatarFallback>+{project.team.length - 5}</AvatarFallback></Avatar>}
                        </div>
                    </div>
                    <ProjectDetailsDialog project={project} users={users} resources={resources} currentUser={{uid: user.uid, displayName: user.displayName, role: user.role}} onActionComplete={fetchData} isMobile={isMobile} />
                </CardFooter>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  )
}
