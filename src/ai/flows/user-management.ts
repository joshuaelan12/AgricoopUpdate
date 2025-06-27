'use server';
/**
 * @fileOverview User management flows.
 * - createUser - Creates a new user in Firebase Auth and Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';


// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  try {
    // Attempt to initialize with application default credentials
    initializeApp();
  } catch (e) {
    console.error('Firebase admin initialization error: make sure you have GOOGLE_APPLICATION_CREDENTIALS set.', e);
    // As a fallback for local dev, you might use a service account key
    // but DO NOT commit the key to your repository.
    // if (process.env.SERVICE_ACCOUNT_KEY) {
    //   initializeApp({
    //     credential: cert(JSON.parse(process.env.SERVICE_ACCOUNT_KEY)),
    //   });
    // }
  }
}

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
        createdAt: new Date(),
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
