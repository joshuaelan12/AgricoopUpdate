'use server';

import { z } from 'zod';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin';
import type { CreateUserInput, CreateUserOutput } from '@/lib/schemas';


export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
    try {
      // Create user in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });

      // Create user document in Firestore
      await adminDb.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        displayName: input.displayName,
        email: input.email,
        companyId: input.companyId,
        role: input.role,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        user: {
            uid: userRecord.uid,
            email: userRecord.email!,
            displayName: userRecord.displayName!
        }
      };
    } catch (error: any) {
       console.error("Error in createUser server action:", error);
       let errorMessage = 'An unknown error occurred.';
       if (error.code === 'auth/email-already-exists') {
           errorMessage = 'This email address is already in use by another account.';
       } else if (error.message) {
           errorMessage = error.message;
       }
      return {
        success: false,
        error: errorMessage,
      };
    }
}
