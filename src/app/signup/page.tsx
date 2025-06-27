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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Passwords do not match.",
      });
      return;
    }
    if (!fullName || !companyName) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Please fill in all fields.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Firebase Auth profile
      await updateProfile(user, { displayName: fullName });

      // 3. Handle Company and User Role in Firestore
      const companiesRef = collection(db, "companies");
      const q = query(companiesRef, where("name", "==", companyName));
      const querySnapshot = await getDocs(q);

      let companyId: string;
      let userRole: string = 'Member';

      if (querySnapshot.empty) {
        // Company doesn't exist, create it and set user as Admin
        const newCompanyRef = await addDoc(companiesRef, {
          name: companyName,
          createdAt: serverTimestamp(),
        });
        companyId = newCompanyRef.id;
        userRole = 'Admin';
      } else {
        // Company exists, assign user to it
        companyId = querySnapshot.docs[0].id;
      }

      // 4. Create user document in 'users' collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: fullName,
        email: user.email,
        companyId: companyId,
        role: userRole,
        createdAt: serverTimestamp(),
      });

      router.push("/");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Leaf className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl text-center font-headline">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to sign up for AgriCoop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                type="text"
                placeholder="AgriCorp Inc."
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
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
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
