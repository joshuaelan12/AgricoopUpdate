'use server';
/**
 * @fileOverview User management flows.
 * - createUser - Creates a new user in Firebase Auth and Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = () => {
    // Initialize Firebase Admin SDK if not already initialized.
    if (!getApps().length) {
        try {
            // When running on App Hosting, the SDK is automatically initialized via Application Default Credentials.
            // For local development, you must set the GOOGLE_APPLICATION_CREDENTIALS
            // environment variable to point to your service account key file.
            // See: https://firebase.google.com/docs/admin/setup#initialize-sdk
            initializeApp();
        } catch (error: any) {
            console.error('Firebase Admin SDK initialization error:', error.stack);
            throw new Error(`Failed to initialize Firebase Admin SDK. Please ensure your environment is configured correctly. Original error: ${error.message}`);
        }
    }
};

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
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    try {
      initializeFirebaseAdmin();
      const auth = getAuth();
      const firestore = getFirestore();

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });

      // Create user document in Firestore
      await firestore.collection('users').doc(userRecord.uid).set({
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
);
