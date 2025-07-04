
'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateProjectInputSchema, UpdateProjectProgressInputSchema, AddProjectCommentInputSchema, type CreateProjectInput, type UpdateProjectProgressInput, type AddProjectCommentInput } from '@/lib/schemas';

// --- SERVER ACTION ---
export async function createProject(input: CreateProjectInput) {
    try {
        const validatedInput = CreateProjectInputSchema.parse(input);

        const newProjectRef = adminDb.collection('projects').doc();
        
        await newProjectRef.set({
            ...validatedInput,
            progress: 0,
            comments: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
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

export async function updateProjectProgress(input: UpdateProjectProgressInput) {
    try {
        const validatedInput = UpdateProjectProgressInputSchema.parse(input);
        const { projectId, progress } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        
        // Security note: In a real-world scenario, you'd want to verify
        // that the user making this request has permission to update this project.
        // This would typically involve verifying a session token from the client.
        // For this app, permission is enforced on the client-side UI.

        await projectRef.update({
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/projects');
        revalidatePath('/'); // Also revalidate dashboard for charts

        return { success: true };

    } catch (error: any) {
        console.error("Error updating project progress:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}


export async function addProjectComment(input: AddProjectCommentInput) {
    try {
        const validatedInput = AddProjectCommentInputSchema.parse(input);
        const { projectId, commentText, userId, userName } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);

        const newComment = {
            id: adminDb.collection('projects').doc().id, // Generate a unique ID for the comment
            text: commentText,
            authorId: userId,
            authorName: userName,
            createdAt: new Date(),
        };

        await projectRef.update({
            comments: FieldValue.arrayUnion(newComment)
        });

        revalidatePath('/projects');

        return { success: true };
        
    } catch (error: any) {
        console.error("Error adding comment:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
