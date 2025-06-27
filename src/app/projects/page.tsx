import Image from "next/image"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const projects = [
  {
    title: "Alpha Orchard Expansion",
    status: "In Progress",
    description: "Expanding the main orchard by 20 acres to increase apple yield.",
    progress: 80,
    team: ["AD", "JD", "SM"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "apple orchard"
  },
  {
    title: "Bravo Irrigation System Upgrade",
    status: "On Hold",
    description: "Upgrading the irrigation system to a new water-efficient drip technology.",
    progress: 45,
    team: ["MP", "LG"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "irrigation system"
  },
  {
    title: "Charlie Soil Health Initiative",
    status: "Completed",
    description: "A 6-month initiative to improve soil organic matter across all fields.",
    progress: 100,
    team: ["EW", "TS", "PL"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "healthy soil"
  },
  {
    title: "Delta Pest Management Research",
    status: "In Progress",
    description: "Researching and implementing new organic pest management techniques.",
    progress: 65,
    team: ["JD", "MP"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "farm research"
  },
    {
    title: "Echo Greenhouse Construction",
    status: "Planning",
    description: "Construction of a new 5000 sq. ft. greenhouse for vegetable cultivation.",
    progress: 15,
    team: ["SM", "LG"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "greenhouse construction"
  },
  {
    title: "Foxtrot Harvest Automation",
    status: "Delayed",
    description: "Integrating automated harvesting bots to improve efficiency.",
    progress: 30,
    team: ["TS", "EW", "AD"],
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "farm automation"
  },
];

const statusColors: { [key: string]: string } = {
  "In Progress": "bg-blue-500",
  "On Hold": "bg-yellow-500",
  "Completed": "bg-green-600",
  "Planning": "bg-gray-500",
  "Delayed": "bg-red-500",
};


export default function ProjectsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Projects</h1>
        <p className="text-muted-foreground">
          Browse and manage all projects within your cooperative.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <div className="relative h-40 w-full mb-4">
                  <Image
                    src={project.imageUrl}
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
                  {project.team.map((initials, i) => (
                    <Avatar key={i} className="h-8 w-8 border-2 border-card">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
