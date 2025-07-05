"use client";

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface AuthUser extends User {
    companyId: string;
    companyName: string;
    role: 'Admin' | 'Project Manager' | 'Member' | 'Accountant';
}

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    // Directly check if the auth object from firebase.ts is available.
    // If it's null, Firebase is not configured.
    const isConfigured = !!auth;

    useEffect(() => {
        // If not configured, don't proceed with auth state listening.
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser && db) {
                const userDocRef = doc(db, "users", authUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    
                    const companyDocRef = doc(db, "companies", userData.companyId);
                    const companyDocSnap = await getDoc(companyDocRef);
                    const companyName = companyDocSnap.exists() ? companyDocSnap.data().name : "Unknown Company";

                    setUser({
                        ...authUser,
                        companyId: userData.companyId,
                        companyName: companyName,
                        role: userData.role,
                    });
                } else {
                    // User exists in Auth but not in Firestore DB.
                    // This can happen if signup process was interrupted.
                    // Treat as not logged in.
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isConfigured]); // Rerun if isConfigured changes (it won't, but it's a dependency)

    return { user, loading, isConfigured };
}
