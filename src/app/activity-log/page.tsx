'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, onSnapshot, Timestamp } from 'firebase/firestore';
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
      return;
    }

    if (!user || !user.companyId) {
      setLoading(false);
      setLogs([]);
      return;
    }

    const logsRef = collection(db, 'activity_logs');
    // A query that filters by one field and orders by another requires a composite index.
    // To make this more robust and avoid needing a manual index creation step in Firestore,
    // we will fetch a larger batch of recent logs and perform the sorting on the client.
    const logsQuery = query(
      logsRef, 
      where('companyId', '==', user.companyId), 
      limit(100) // Fetch a larger batch to sort from
    );
    
    const unsubscribe = onSnapshot(logsQuery, (querySnapshot) => {
        const logsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const timestamp = data.timestamp as Timestamp | null;
            return {
                id: doc.id,
                message: data.message,
                timestamp: timestamp ? timestamp.toDate() : new Date(),
                companyId: data.companyId,
            };
        });
        
        // Sort client-side to ensure descending chronological order.
        logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Now take the most recent 50 to display.
        setLogs(logsData.slice(0, 50));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching activity logs:", error);
        setLoading(false);
        setLogs([]);
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
