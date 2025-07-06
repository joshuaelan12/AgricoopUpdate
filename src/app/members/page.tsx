'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Users, PlusCircle } from 'lucide-react';

// --- DATA INTERFACE ---
interface Member {
  uid: string;
  displayName: string;
  role: string;
  email: string;
  status: "Active" | "Invited"; // Assuming a status field might exist or can be derived
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

const statusVariant: { [key: string]: "default" | "secondary" } = {
  "Active": "default",
  "Invited": "secondary",
};


export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('companyId', '==', user.companyId));
      const querySnapshot = await getDocs(q);
      
      const membersData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        status: 'Active', // Assuming all users in DB are active
      })) as Member[];
      
      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching members:", error);
      setMembers([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (loading) {
    return <MembersSkeleton />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-4xl font-headline text-foreground">Members</h1>
            <p className="text-muted-foreground">
              View and manage all members of your cooperative.
            </p>
        </div>
        {user?.role === 'Admin' && (
            <Link href="/admin/create-user">
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Member
                </Button>
            </Link>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Company Roster</CardTitle>
          <CardDescription>A list of all users in your company.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(member.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.displayName}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant[member.status]}>
                        {member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Members Found</h2>
              <p className="text-muted-foreground">
                Create new users from the Admin Dashboard to see them here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// --- SKELETON COMPONENT ---
const MembersSkeleton = () => (
   <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Members</h1>
        <p className="text-muted-foreground">
          View and manage all members of your cooperative.
        </p>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
);