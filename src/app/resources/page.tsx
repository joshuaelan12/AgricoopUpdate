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
import { Package, Tractor, Droplets, DollarSign } from "lucide-react"

const resources = [
  { name: "Organic Fertilizer", category: "Inputs", quantity: "500 kg", status: "In Stock" },
  { name: "Heirloom Tomato Seeds", category: "Inputs", quantity: "20 kg", status: "Low Stock" },
  { name: "John Deere 5075E Tractor", category: "Equipment", quantity: "1", status: "In Use" },
  { name: "Drip Irrigation Kit", category: "Equipment", quantity: "5 kits", status: "Needs Maintenance" },
  { name: "Water Reservoir", category: "Infrastructure", quantity: "80% full", status: "Good" },
  { name: "Co-op Operating Budget", category: "Finance", quantity: "$50,000", status: "On Track" },
];

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
                <TableRow key={resource.name}>
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
        </CardContent>
      </Card>
    </div>
  )
}
