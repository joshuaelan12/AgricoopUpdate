
'use client';

import { useState, useEffect } from "react";
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from 'firebase/firestore';

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
import { FolderKanban } from "lucide-react";

// --- DATA INTERFACES ---
interface Project {
  id: string;
  title: string;
  status: "In Progress" | "On Hold" | "Completed" | "Planning" | "Delayed";
  description: string;
  progress: number;
  team: string[]; // Array of user UIDs
  imageUrl: string;
  imageHint: string;
  companyId: string;
}

interface UserData {
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
      <div className="relative h-40 w-full mb-4">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
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

// --- MAIN COMPONENT ---
export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{ [uid: string]: UserData }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!user?.companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
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

        const projectsData = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
        
        const usersData = usersSnap.docs.reduce((acc, doc) => {
          acc[doc.id] = doc.data() as UserData;
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
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Projects</h1>
        <p className="text-muted-foreground">
          Browse and manage all projects within your cooperative.
        </p>
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
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader>
                <div className="relative h-40 w-full mb-4">
                    <Image
                      src={project.imageUrl || "https://placehold.co/600x400.png"}
                      alt={project.title}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
                      data-ai-hint={project.imageHint}
                    />
                </div>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-2xl">{project.title}</CardTitle>
                    <Badge className={`${statusColors[project.status]} text-primary-foreground`}>{project.status}</Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Progress</span>
                  <Progress value={project.progress} className="mt-1 h-2" />
                  <span className="text-xs text-muted-foreground">{project.progress}% complete</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
