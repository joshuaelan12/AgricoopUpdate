'use client';

import { useState, useEffect } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Tractor, Droplets, DollarSign, Warehouse } from "lucide-react"
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- DATA INTERFACE ---
interface Resource {
    id: string;
    name: string;
    category: "Inputs" | "Equipment" | "Infrastructure" | "Finance" | string;
    quantity: string;
    status: string;
}

const statusBadgeVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  "In Stock": "default",
  "Good": "default",
  "In Use": "default",
  "On Track": "default",
  "Low Stock": "destructive",
  "Needs Maintenance": "destructive",
};

const categoryIcons: { [key: string]: React.ReactNode } = {
  "Inputs": <Package className="h-4 w-4 text-muted-foreground" />,
  "Equipment": <Tractor className="h-4 w-4 text-muted-foreground" />,
  "Infrastructure": <Droplets className="h-4 w-4 text-muted-foreground" />,
  "Finance": <DollarSign className="h-4 w-4 text-muted-foreground" />,
}


export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
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
        // If collection doesn't exist or another error occurs, show an empty list
        setResources([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [user]);

  if (loading) {
    return <ResourcesSkeleton />;
  }


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Resource Management</h1>
        <p className="text-muted-foreground">
          Track and manage your cooperative's assets.
        </p>
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
                  <TableHead>Quantity / Value</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {categoryIcons[resource.category] || <Package className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{resource.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{resource.category}</TableCell>
                    <TableCell>{resource.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusBadgeVariant[resource.status] || "outline"}>
                        {resource.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-center">
              <Warehouse className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-headline">No Resources Found</h2>
              <p className="text-muted-foreground">
                Your inventory is empty. Add resources to see them here.
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
