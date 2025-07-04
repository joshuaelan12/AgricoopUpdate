'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
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
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

interface ActivityLog {
  id: string;
  message: string;
  timestamp: Date;
  companyId: string;
}

export default function ActivityLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      // Still waiting for auth state to be determined.
      return;
    }

    if (!user || !user.companyId) {
      // User is not logged in, or doesn't have a company.
      setLoading(false);
      setLogs([]);
      return;
    }

    setLoading(true);
    
    const logsRef = collection(db, 'activity_logs');
    const logsQuery = query(logsRef, where('companyId', '==', user.companyId), orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(logsQuery, (snap) => {
        const logsData = snap.docs.map(doc => {
            const data = doc.data();
            // Handle pending server timestamps by providing a fallback client-side date.
            // This ensures new activities appear instantly.
            return {
                id: doc.id,
                message: data.message,
                timestamp: data.timestamp?.toDate() || new Date(),
                companyId: data.companyId,
            };
        });
        
        setLogs(logsData as ActivityLog[]);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching activity logs:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return <ActivityLogSkeleton />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Activity Log</h1>
        <p className="text-muted-foreground">
          A real-time feed of recent actions across the application.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Activities</CardTitle>
          <CardDescription>Showing the last 50 actions performed in your company.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.message}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Activity Yet</h2>
              <p className="text-muted-foreground">
                Perform an action like creating a project to see the log populated.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ActivityLogSkeleton = () => (
  <div>
    <div className="mb-8">
      <Skeleton className="h-10 w-1/3 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-2/3 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
