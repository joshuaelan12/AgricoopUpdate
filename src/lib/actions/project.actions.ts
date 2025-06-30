'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

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
