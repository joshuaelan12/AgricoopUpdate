
'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateProjectInputSchema, UpdateProjectProgressInputSchema, AddProjectCommentInputSchema, DeleteProjectCommentInputSchema, type CreateProjectInput, type UpdateProjectProgressInput, type AddProjectCommentInput, type DeleteProjectCommentInput, UpdateProjectInputSchema, DeleteProjectInputSchema, type UpdateProjectInput, type DeleteProjectInput, UpdateProjectStatusInputSchema, type UpdateProjectStatusInput } from '@/lib/schemas';

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


export async function deleteProjectComment(input: DeleteProjectCommentInput) {
    try {
        const { projectId, commentId, userId } = DeleteProjectCommentInputSchema.parse(input);

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectSnap = await projectRef.get();

        if (!projectSnap.exists) {
            return { success: false, error: "Project not found." };
        }

        const projectData = projectSnap.data();
        if (!projectData || !Array.isArray(projectData.comments)) {
            return { success: false, error: "Comments not found on this project." };
        }
        
        const commentToDelete = projectData.comments.find(c => c.id === commentId);

        if (!commentToDelete) {
            return { success: false, error: "Comment not found." };
        }

        if (commentToDelete.authorId !== userId) {
            return { success: false, error: "You do not have permission to delete this comment." };
        }

        await projectRef.update({
            comments: FieldValue.arrayRemove(commentToDelete),
        });

        revalidatePath('/projects');

        return { success: true };

    } catch (error: any) {
        console.error("Error deleting comment:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateProject(input: UpdateProjectInput) {
    try {
        const validatedInput = UpdateProjectInputSchema.parse(input);
        const { id, ...updateData } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(id);
        
        await projectRef.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        revalidatePath('/projects');
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating project:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteProject(input: DeleteProjectInput) {
    try {
        const validatedInput = DeleteProjectInputSchema.parse(input);
        const { projectId } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        
        await projectRef.delete();
        
        revalidatePath('/projects');
        revalidatePath('/');
        
        return { success: true };

    } catch (error: any) {
        console.error("Error deleting project:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateProjectStatus(input: UpdateProjectStatusInput) {
    try {
        const validatedInput = UpdateProjectStatusInputSchema.parse(input);
        const { projectId, status } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);

        await projectRef.update({
            status: status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/projects');
        revalidatePath('/'); // Dashboard might show project statuses

        return { success: true };

    } catch (error: any) {
        console.error("Error updating project status:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
