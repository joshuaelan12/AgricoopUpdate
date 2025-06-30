'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string(),
  companyId: z.string(),
  role: z.enum(['Project Manager', 'Member', 'Accountant']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  user: z.object({
      uid: z.string(),
      email: z.string(),
      displayName: z.string()
  }).optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;


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
