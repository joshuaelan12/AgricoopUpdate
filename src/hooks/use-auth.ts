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

    // If Firebase isn't configured, `auth` will be null.
    // Throw an error on the client-side to be caught by the error boundary,
    // which will then display a helpful setup guide.
    if (!auth) {
        throw new Error('Firebase: Error (auth/invalid-api-key).');
    }

    useEffect(() => {
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
    }, []);

    return { user, loading };
}
