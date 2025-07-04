
'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createProject, updateProjectProgress, addProjectComment, deleteProjectComment } from "@/lib/actions/project.actions";
import { CreateProjectInputSchema, AddProjectCommentInputSchema } from "@/lib/schemas";
import type { AddProjectCommentInput } from "@/lib/schemas";
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

import { FolderKanban, PlusCircle, Users as UsersIcon, ChevronDown, Loader2, MessageSquare, Trash2 } from "lucide-react";


// --- DATA INTERFACES ---
interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

interface Project {
  id: string;
  title: string;
  status: "In Progress" | "On Hold" | "Completed" | "Planning" | "Delayed";
  description: string;
  progress: number;
  team: string[]; // Array of user UIDs
  companyId: string;
  comments: Comment[];
}

interface UserData {
  uid: string;
  displayName: string;
}

// --- HELPER FUNCTIONS ---
const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const statusColors: { [key: string]: string } = {
  "In Progress": "bg-blue-500",
  "On Hold": "bg-yellow-500",
  "Completed": "bg-green-600",
  "Planning": "bg-gray-500",
  "Delayed": "bg-red-500",
};

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

// --- CREATE PROJECT DIALOG COMPONENT ---
type CreateProjectDialogProps = {
  users: UserData[];
  companyId: string;
};

function CreateProjectDialog({ users, companyId }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof CreateProjectInputSchema>>({
    resolver: zodResolver(CreateProjectInputSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "Planning",
      team: [],
      companyId: companyId,
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateProjectInputSchema>) => {
    const result = await createProject(values);
    if (result.success) {
      toast({
        title: "Project Created",
        description: `"${values.title}" has been successfully created.`,
      });
      form.reset();
      setOpen(false);
      router.refresh();
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
              <FormItem>
                <FormLabel>Project Title</FormLabel>
                <FormControl><Input placeholder="e.g., Spring Planting Initiative" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Describe the project's goals and scope." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["Planning", "In Progress", "On Hold", "Delayed", "Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="team" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Team</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-between">
                         {field.value?.length > 0 ? `${field.value.length} selected` : "Select team members"}
                         <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Available Members</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {users.map(user => (
                         <DropdownMenuCheckboxItem
                          key={user.uid}
                          checked={field.value?.includes(user.uid)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, user.uid])
                              : field.onChange(field.value?.filter(id => id !== user.uid))
                          }}
                        >
                          {user.displayName}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
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


// --- MAIN COMPONENT ---
export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: UserData }>({});
  const [loading, setLoading] = useState(true);
  const [updatingProgressId, setUpdatingProgressId] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<{ [projectId: string]: number }>({});
  const [newComments, setNewComments] = useState<{ [key: string]: string }>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);


  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user?.companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLiveProgress({}); // Reset live progress on new fetch
      try {
        const { companyId } = user;
        const projectsRef = collection(db, 'projects');
        const usersRef = collection(db, 'users');

        const projectsQuery = query(projectsRef, where('companyId', '==', companyId));
        const usersQuery = query(usersRef, where('companyId', '==', companyId));

        const [projectsSnap, usersSnap] = await Promise.all([
          getDocs(projectsQuery),
          getDocs(usersQuery),
        ]);

        const projectsData = projectsSnap.docs.map(doc => {
            const data = doc.data();
            const comments = (data.comments || []).map((comment: any) => ({
                ...comment,
                createdAt: comment.createdAt?.toDate(), // Safely convert timestamp
            })).filter((c: Comment) => c.createdAt); // Filter out any comments that failed to convert
            return { id: doc.id, ...data, comments };
        }) as Project[];
        
        const usersData = usersSnap.docs.reduce((acc, doc) => {
          acc[doc.id] = { uid: doc.id, ...(doc.data() as Omit<UserData, 'uid'>) };
          return acc;
        }, {} as { [uid: string]: UserData });

        setProjects(projectsData);
        setUsers(usersData);

      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [user]);

  const handleAddComment = async (e: React.FormEvent, projectId: string) => {
      e.preventDefault();
      if (!user || !newComments[projectId]?.trim()) return;

      setIsSubmittingComment(projectId);
      const commentText = newComments[projectId];

      const input: AddProjectCommentInput = {
          projectId,
          commentText,
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
      };
      
      const result = await addProjectComment(input);

      if (result.success) {
          setNewComments(prev => ({...prev, [projectId]: ''}));
          toast({
              title: "Comment Added",
              description: "Your comment has been posted.",
          });
          router.refresh();
      } else {
          toast({
              variant: "destructive",
              title: "Failed to post comment",
              description: result.error || "An unknown error occurred.",
          });
      }
      setIsSubmittingComment(null);
  };

  const handleDeleteComment = async (projectId: string, commentId: string) => {
    if (!user) return;

    setIsDeletingComment(commentId);
    const result = await deleteProjectComment({
      projectId,
      commentId,
      userId: user.uid,
    });

    if (result.success) {
      toast({
        title: "Comment Deleted",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Failed to delete comment",
        description: result.error || "An unknown error occurred.",
      });
    }
    setIsDeletingComment(null);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-headline text-foreground">Projects</h1>
          <p className="text-muted-foreground">
            Browse and manage all projects within your cooperative.
          </p>
        </div>
         {user && (user.role === 'Admin' || user.role === 'Project Manager') && !loading && (
          <CreateProjectDialog 
            users={Object.values(users)} 
            companyId={user.companyId} 
          />
        )}
      </div>

      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && projects.length === 0 && (
         <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Projects Yet</h2>
              <p className="text-muted-foreground">
                Get started by creating your first project.
              </p>
            </CardContent>
          </Card>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const canUpdate = user && project.team.includes(user.uid);
            const isUpdating = updatingProgressId === project.id;
            const displayProgress = liveProgress[project.id] ?? project.progress;

            return (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-2xl">{project.title}</CardTitle>
                      <Badge className={`${statusColors[project.status]} text-primary-foreground`}>{project.status}</Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Progress</span>
                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {canUpdate ? (
                      <Slider
                        value={[displayProgress]}
                        max={100}
                        step={1}
                        disabled={isUpdating}
                        onValueChange={(value) => {
                          setLiveProgress(prev => ({...prev, [project.id]: value[0]}))
                        }}
                        onValueCommit={async (value) => {
                          setUpdatingProgressId(project.id);
                          const result = await updateProjectProgress({
                            projectId: project.id,
                            progress: value[0],
                          });
                          if (!result.success) {
                            toast({
                              variant: "destructive",
                              title: "Update Failed",
                              description: result.error,
                            });
                             // On failure, revert the UI by removing the live progress value
                            setLiveProgress(prev => {
                                const newState = {...prev};
                                delete newState[project.id];
                                return newState;
                            });
                          }
                          setUpdatingProgressId(null);
                        }}
                        className="my-2"
                      />
                    ) : (
                      <Progress value={project.progress} className="mt-1 h-2" />
                    )}
                    <span className="text-xs text-muted-foreground">{displayProgress}% complete</span>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </h4>
                    <div className="space-y-4 max-h-48 overflow-y-auto pr-2 mb-4">
                      {project.comments?.length > 0 ? (
                        project.comments
                          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                          .map((comment) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 border">
                                <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
                              </Avatar>
                              <div className="w-full bg-muted/50 p-2 rounded-md">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{comment.authorName}</p>
                                   {user?.uid === comment.authorId && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete this comment. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteComment(project.id, comment.id)}
                                            disabled={isDeletingComment === comment.id}
                                          >
                                            {isDeletingComment === comment.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
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

                    {canUpdate && (
                      <form onSubmit={(e) => handleAddComment(e, project.id)} className="flex items-start gap-2">
                        <Avatar className="h-9 w-9 border">
                          <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                          <Textarea
                            placeholder="Add a comment..."
                            value={newComments[project.id] || ''}
                            onChange={(e) => setNewComments(prev => ({ ...prev, [project.id]: e.target.value }))}
                            className="min-h-[40px] bg-background"
                          />
                          <Button 
                            type="submit" 
                            size="sm" 
                            className="mt-2" 
                            disabled={isSubmittingComment === project.id || !newComments[project.id]?.trim()}
                          >
                            {isSubmittingComment === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium text-muted-foreground">Team</span>
                    <div className="flex -space-x-2">
                      {project.team.map((uid, i) => (
                        <Avatar key={i} className="h-8 w-8 border-2 border-card">
                          <AvatarFallback>{getInitials(users[uid]?.displayName)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
