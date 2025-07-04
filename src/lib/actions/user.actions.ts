'use server';

import { z } from 'zod';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin';
import { CreateUserInputSchema, type CreateUserInput, type CreateUserOutput } from '@/lib/schemas';
import { logActivity } from './activity.actions';


export async function createUser(input: CreateUserInput, actorName: string): Promise<CreateUserOutput> {
    try {
      // Validate input on the server for security
      const validatedInput = CreateUserInputSchema.parse(input);

      // Create user in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email: validatedInput.email,
        password: validatedInput.password,
        displayName: validatedInput.displayName,
      });

      // Create user document in Firestore
      await adminDb.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        displayName: validatedInput.displayName,
        email: validatedInput.email,
        companyId: validatedInput.companyId,
        role: validatedInput.role,
        createdAt: FieldValue.serverTimestamp(),
      });

      await logActivity(validatedInput.companyId, `${actorName} created a new user account for ${validatedInput.displayName}.`);

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
       
       if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
       }
       
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
