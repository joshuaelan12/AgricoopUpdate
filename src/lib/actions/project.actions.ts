'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// --- INITIALIZE FIREBASE ADMIN ---
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

// --- ZOD SCHEMAS ---
export const CreateProjectInputSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  status: z.enum(["Planning", "In Progress", "On Hold", "Completed", "Delayed"]),
  team: z.array(z.string()).min(1, "At least one team member is required."),
  companyId: z.string(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

// --- SERVER ACTION ---
export async function createProject(input: CreateProjectInput) {
    let app: App;
    try {
        app = initializeFirebaseAdmin();
    } catch (error: any) {
        return { success: false, error: error.message };
    }

    const firestore = getFirestore(app);

    try {
        const validatedInput = CreateProjectInputSchema.parse(input);

        const newProjectRef = firestore.collection('projects').doc();
        
        await newProjectRef.set({
            ...validatedInput,
            progress: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            imageUrl: "https://placehold.co/600x400.png",
            imageHint: "project abstract"
        });
        
        revalidatePath('/projects'); // Invalidate cache for the projects page
        
        return { success: true, projectId: newProjectRef.id };

    } catch (error: any) {
        console.error("Error creating project:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
