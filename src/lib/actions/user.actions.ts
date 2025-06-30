'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = (): App => {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
            return initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e: any) {
            console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e.message);
            throw new Error("The FIREBASE_ADMIN_SDK_CONFIG environment variable is not a valid JSON object.");
        }
    } else {
       throw new Error('Firebase Admin authentication failed. The FIREBASE_ADMIN_SDK_CONFIG environment variable is not set. Please set it as a JSON string in your .env file. You can get these credentials from your Firebase project settings under "Service accounts".');
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
    let app: App;
    try {
        app = initializeFirebaseAdmin();
    } catch (error: any) {
        console.error("Firebase Admin SDK Initialization Error:", error.message);
        return {
            success: false,
            error: `Failed to initialize Firebase Admin SDK. This is a server configuration issue. Details: ${error.message}`
        }
    }
    
    try {
      const auth = getAuth(app);
      const firestore = getFirestore(app);

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
