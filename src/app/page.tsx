'use client';

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
import { Progress } from "@/components/ui/progress"
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
import { FolderKanban, ListChecks, Users, Warehouse } from "lucide-react"

const projectProgressData = [
  { name: 'Alpha', progress: 80 },
  { name: 'Bravo', progress: 45 },
  { name: 'Charlie', progress: 60 },
  { name: 'Delta', progress: 95 },
  { name: 'Echo', progress: 20 },
];

const resourceAllocationData = [
  { month: 'Jan', seeds: 400, fertilizer: 240 },
  { month: 'Feb', seeds: 300, fertilizer: 139 },
  { month: 'Mar', seeds: 200, fertilizer: 980 },
  { month: 'Apr', seeds: 278, fertilizer: 390 },
  { month: 'May', seeds: 189, fertilizer: 480 },
  { month: 'Jun', seeds: 239, fertilizer: 380 },
];

export default function Dashboard() {
  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Total Projects</CardDescription>
            <CardTitle className="text-4xl font-headline">12</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +2 since last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Tasks Due Soon</CardDescription>
            <CardTitle className="text-4xl font-headline">5</CardTitle>
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
            <CardTitle className="text-4xl font-headline">84</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              +10 since last quarter
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-headline">Resources</CardDescription>
            <CardTitle className="text-4xl font-headline">Alerts: 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Low on fertilizer and seeds
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>
              An overview of recent tasks and updates.
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
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Soil Testing</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Assigned to: Jane Doe
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">In Progress</Badge>
                  </TableCell>
                  <TableCell>Project Alpha</TableCell>
                  <TableCell className="text-right">2 hours ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Equipment Maintenance</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Assigned to: John Smith
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-600 text-white">Completed</Badge>
                  </TableCell>
                  <TableCell>Project Bravo</TableCell>
                  <TableCell className="text-right">1 day ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Pest Scouting</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                       Assigned to: Emily White
                    </div>
                  </TableCell>
                   <TableCell>
                    <Badge variant="destructive">Overdue</Badge>
                  </TableCell>
                  <TableCell>Project Charlie</TableCell>
                  <TableCell className="text-right">3 days ago</TableCell>
                </TableRow>
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
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectProgressData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{ 
                        background: "hsl(var(--background))", 
                        borderColor: "hsl(var(--border))"
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px"}}/>
                    <Bar dataKey="progress" fill="hsl(var(--primary))" name="Progress (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <CardTitle className="font-headline">Resource Allocation</CardTitle>
            <CardDescription>Monthly usage of key resources.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={resourceAllocationData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                <Tooltip 
                  contentStyle={{ 
                        background: "hsl(var(--background))", 
                        borderColor: "hsl(var(--border))"
                      }}
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
