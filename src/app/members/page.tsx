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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const members = [
  {
    name: "Alex Denton",
    role: "Project Manager",
    email: "alex@agricoop.com",
    status: "Active",
    initials: "AD",
  },
  {
    name: "Jane Doe",
    role: "Member",
    email: "jane@agricoop.com",
    status: "Active",
    initials: "JD",
  },
  {
    name: "Sam Morrow",
    role: "Accountant",
    email: "sam@agricoop.com",
    status: "Active",
    initials: "SM",
  },
  {
    name: "Maria Garcia",
    role: "Member",
    email: "maria@agricoop.com",
    status: "Invited",
    initials: "MG",
  },
];

const statusVariant: { [key: string]: "default" | "secondary" } = {
  "Active": "default",
  "Invited": "secondary",
};

export default function MembersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-headline text-foreground">Members</h1>
        <p className="text-muted-foreground">
          View and manage all members of your cooperative.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Company Roster</CardTitle>
          <CardDescription>A list of all users in your company.</CardDescription>
        </CardHeader>
        <CardContent>
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
                <TableRow key={member.email}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                         <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
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
        </CardContent>
      </Card>
    </div>
  )
}
