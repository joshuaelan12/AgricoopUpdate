'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import generatePdf from '@/lib/pdf-generator';

// --- Data Interfaces ---
interface Project {
  id: string;
  title: string;
  status: string;
  progress: number;
  team: string[];
  outputs: { description: string, quantity: number, unit: string, date: any }[];
}

interface Resource {
  id: string;
  name: string;
  category: string;
  quantity: number;
  status: string;
}

interface Member {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

// --- Helper for CSV Download ---
function downloadCsv(data: any[], filename: string) {
  if (data.length === 0) {
    alert("No data available to download.");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => 
      headers.map(fieldName => 
        JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)
      ).join(',')
    )
  ];
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

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
              status: data.status,
              progress: data.progress,
              team: data.team,
              outputs: (data.outputs || []).map((o: any) => ({
                ...o,
                date: o.date?.toDate()?.toISOString().split('T')[0] || '', // Format date
              })),
          }
      }) as Project[];

      const resourcesData = resourcesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resource[];
      const membersData = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as Member[];

      setProjects(projectsData);
      setResources(resourcesData);
      setMembers(membersData);

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const handleDownloadProjectsCsv = () => {
    const data = projects.map(p => ({
        Project_ID: p.id,
        Title: p.title,
        Status: p.status,
        Progress_Percent: p.progress,
        Team_Member_Count: p.team.length,
    }));
    downloadCsv(data, 'project_summary_report.csv');
  };

   const handleDownloadProjectsPdf = () => {
    const head = [['Project ID', 'Title', 'Status', 'Progress (%)', 'Team Size']];
    const body = projects.map(p => [
      p.id,
      p.title,
      p.status,
      `${p.progress}%`,
      p.team.length,
    ]);
    generatePdf('Project Summary Report', head, body);
  };

  const handleDownloadResourcesCsv = () => {
     const data = resources.map(r => ({
        Resource_ID: r.id,
        Name: r.name,
        Category: r.category,
        Quantity_kg: r.quantity,
        Status: r.status,
    }));
    downloadCsv(data, 'resource_inventory_report.csv');
  };

  const handleDownloadResourcesPdf = () => {
    const head = [['Resource ID', 'Name', 'Category', 'Quantity (kg)', 'Status']];
    const body = resources.map(r => [r.id, r.name, r.category, r.quantity, r.status]);
    generatePdf('Resource Inventory Report', head, body);
  };
  
  const handleDownloadMembersCsv = () => {
    const data = members.map(m => ({
        Member_ID: m.uid,
        Name: m.displayName,
        Email: m.email,
        Role: m.role,
    }));
    downloadCsv(data, 'team_roster_report.csv');
  };

  const handleDownloadMembersPdf = () => {
    const head = [['Member ID', 'Name', 'Email', 'Role']];
    const body = members.map(m => [m.uid, m.displayName, m.email, m.role]);
    generatePdf('Team Roster Report', head, body);
  };

  const handleDownloadOutputsCsv = () => {
    const data = projects.flatMap(p => 
        (p.outputs || []).map(o => ({
            Project_ID: p.id,
            Project_Title: p.title,
            Output_Date: o.date,
            Output_Description: o.description,
            Quantity: o.quantity,
            Unit: o.unit,
        }))
    );
     downloadCsv(data, 'project_outputs_report.csv');
  };

  const handleDownloadOutputsPdf = () => {
    const head = [['Project', 'Date', 'Description', 'Quantity', 'Unit']];
    const body = projects.flatMap(p =>
      (p.outputs || []).map(o => [
        p.title,
        o.date,
        o.description,
        o.quantity,
        o.unit,
      ])
    );
    generatePdf('Project Outputs Report', head, body);
  };

  if (loading || authLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Generate Reports</h1>
        <p className="text-muted-foreground">
          Download CSV or PDF reports for projects, resources, and more.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Summary Report</CardTitle>
            <CardDescription>A summary of all projects, including status, progress, and team size.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadProjectsCsv} disabled={projects.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button onClick={handleDownloadProjectsPdf} disabled={projects.length === 0} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Inventory Report</CardTitle>
            <CardDescription>A complete list of all resources, their category, quantity, and status.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadResourcesCsv} disabled={resources.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button onClick={handleDownloadResourcesPdf} disabled={resources.length === 0} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Roster Report</CardTitle>
            <CardDescription>A list of all team members in your company, including their role and email.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadMembersCsv} disabled={members.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                 <Button onClick={handleDownloadMembersPdf} disabled={members.length === 0} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
             </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Project Outputs Report</CardTitle>
            <CardDescription>A detailed log of all production outputs recorded for every project.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadOutputsCsv} disabled={projects.flatMap(p => p.outputs || []).length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button onClick={handleDownloadOutputsPdf} disabled={projects.flatMap(p => p.outputs || []).length === 0} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ReportsSkeleton = () => (
    <div>
      <div className="mb-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
       <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-36" />
                            <Skeleton className="h-10 w-36" />
                        </div>
                    </CardContent>
                </Card>
            ))}
       </div>
    </div>
);
