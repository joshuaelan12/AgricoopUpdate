'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateProjectInputSchema, type CreateProjectInput } from '@/lib/schemas';

// --- SERVER ACTION ---
export async function createProject(input: CreateProjectInput) {
    try {
        const validatedInput = CreateProjectInputSchema.parse(input);

        const newProjectRef = adminDb.collection('projects').doc();
        
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
