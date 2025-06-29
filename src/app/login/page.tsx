"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, getDoc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuthUser } from "@/hooks/use-auth";

const roles: AuthUser['role'][] = ['Admin', 'Project Manager', 'Member', 'Accountant'];

export default function LoginPage() {
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<AuthUser['role'] | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!companyName || !role || !email || !password) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Please fill in all fields.",
        });
        setIsLoading(false);
        return;
    }

    try {
      // 1. Authenticate with email/password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get user document from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
          await signOut(auth);
          toast({
              variant: "destructive",
              title: "Login Failed",
              description: "User profile not found. Please contact your admin.",
          });
          setIsLoading(false);
          return;
      }
      
      const userData = userDocSnap.data();

      // 3. Get company document from Firestore
      const companyDocRef = doc(db, "companies", userData.companyId);
      const companyDocSnap = await getDoc(companyDocRef);

      if (!companyDocSnap.exists()) {
          await signOut(auth);
          toast({
              variant: "destructive",
              title: "Login Failed",
              description: "Company data associated with this user could not be found.",
          });
          setIsLoading(false);
          return;
      }

      const companyData = companyDocSnap.data();

      // 4. Verify company name (case-insensitive) and role
      const isCompanyMatch = companyData.name.trim().toLowerCase() === companyName.trim().toLowerCase();
      const isRoleMatch = userData.role === role;

      if (isCompanyMatch && isRoleMatch) {
          // Success! Redirect based on role.
          if (role === 'Admin') {
            router.push("/admin-dashboard");
          } else {
            router.push("/");
          }
      } else {
          // Mismatch
          await signOut(auth);
           let description = "Invalid company or role for this account.";
           if (!isCompanyMatch) {
               description = "The company name entered does not match the one on record for this user. Please check for typos and try again."
           } else if (!isRoleMatch) {
               description = `The role selected is incorrect. Your account has a different role assigned.`
           }
          toast({
              variant: "destructive",
              title: "Login Failed",
              description: description,
          });
      }

    } catch (error: any) {
      // On any failure, ensure the user is signed out before showing an error.
      if (auth.currentUser) {
        await signOut(auth);
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'An unexpected error occurred. Please try again.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Leaf className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl text-center font-headline">AgriCoop Login</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Your Company Inc."
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setRole(value as AuthUser['role'])} value={role}>
                    <SelectTrigger id="role">
                        <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                        {roles.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="underline">
              Create a company account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
