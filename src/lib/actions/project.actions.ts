
'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { 
    CreateProjectInputSchema, 
    UpdateProjectProgressInputSchema, 
    AddProjectCommentInputSchema, 
    DeleteProjectCommentInputSchema, 
    type CreateProjectInput, 
    type UpdateProjectProgressInput, 
    type AddProjectCommentInput, 
    type DeleteProjectCommentInput, 
    UpdateProjectInputSchema, 
    DeleteProjectInputSchema, 
    type UpdateProjectInput, 
    type DeleteProjectInput, 
    UpdateProjectStatusInputSchema, 
    type UpdateProjectStatusInput, 
    UpdateProjectPlanningInputSchema, 
    type UpdateProjectPlanningInput,
    AllocateResourceInputSchema,
    DeallocateResourceInputSchema,
    type AllocateResourceInput,
    type DeallocateResourceInput
} from '@/lib/schemas';
import { logActivity } from './activity.actions';

// --- SERVER ACTION ---
export async function createProject(input: CreateProjectInput, actorName: string) {
    try {
        const validatedInput = CreateProjectInputSchema.parse(input);

        const newProjectRef = adminDb.collection('projects').doc();
        
        await newProjectRef.set({
            ...validatedInput,
            progress: 0,
            comments: [],
            objectives: '',
            expectedOutcomes: '',
            priority: 'Medium',
            deadline: null,
            estimatedBudget: 0,
            allocatedResources: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(validatedInput.companyId, `${actorName} created a new project: "${validatedInput.title}".`);
        revalidatePath('/projects');
        
        return { success: true, projectId: newProjectRef.id };

    } catch (error: any) {
        console.error("Error creating project:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateProjectProgress(input: UpdateProjectProgressInput, actorName: string) {
    try {
        const validatedInput = UpdateProjectProgressInputSchema.parse(input);
        const { projectId, progress } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;
        
        await projectRef.update({
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(projectData.companyId, `${actorName} updated the progress of project "${projectData.title}" to ${progress}%.`);
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
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;

        const newComment = {
            id: adminDb.collection('projects').doc().id,
            text: commentText,
            authorId: userId,
            authorName: userName,
            createdAt: new Date(),
        };

        await projectRef.update({
            comments: FieldValue.arrayUnion(newComment)
        });

        await logActivity(projectData.companyId, `${userName} commented on project "${projectData.title}".`);
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

        await logActivity(projectData.companyId, `${commentToDelete.authorName} deleted a comment from project "${projectData.title}".`);
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

export async function updateProject(input: UpdateProjectInput, actorName: string) {
    try {
        const validatedInput = UpdateProjectInputSchema.parse(input);
        const { projectId, ...updateData } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;
        
        await projectRef.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(projectData.companyId, `${actorName} edited the details of project "${validatedInput.title}".`);
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

export async function deleteProject(input: DeleteProjectInput, actorName: string) {
    try {
        const validatedInput = DeleteProjectInputSchema.parse(input);
        const { projectId } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;
        
        await projectRef.delete();
        
        await logActivity(projectData.companyId, `${actorName} deleted project "${projectData.title}".`);
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

export async function updateProjectStatus(input: UpdateProjectStatusInput, actorName: string) {
    try {
        const validatedInput = UpdateProjectStatusInputSchema.parse(input);
        const { projectId, status } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;

        await projectRef.update({
            status: status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await logActivity(projectData.companyId, `${actorName} updated the status of project "${projectData.title}" to "${status}".`);
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

export async function updateProjectPlanning(input: UpdateProjectPlanningInput, actorName: string) {
    try {
        const validatedInput = UpdateProjectPlanningInputSchema.parse(input);
        const { projectId, ...planningData } = validatedInput;

        const projectRef = adminDb.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) throw new Error("Project not found.");
        const projectData = projectDoc.data()!;
        
        const updateData = Object.fromEntries(
          Object.entries(planningData).filter(([, v]) => v !== undefined)
        );

        await projectRef.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(projectData.companyId, `${actorName} updated the plan for project "${projectData.title}".`);
        revalidatePath('/planning');
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating project planning:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}


export async function allocateResourceToProject(input: AllocateResourceInput, actorName: string) {
    try {
        const { projectId, resourceId, quantity } = AllocateResourceInputSchema.parse(input);
        const projectRef = adminDb.collection('projects').doc(projectId);
        const resourceRef = adminDb.collection('resources').doc(resourceId);

        let resourceName = "Unknown Resource";
        let projectName = "Unknown Project";
        let companyId = "";

        await adminDb.runTransaction(async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            const projectDoc = await transaction.get(projectRef);

            if (!resourceDoc.exists) throw new Error("Resource not found.");
            if (!projectDoc.exists) throw new Error("Project not found.");

            const resourceData = resourceDoc.data()!;
            const projectData = projectDoc.data()!;
            
            // For logging
            resourceName = resourceData.name;
            projectName = projectData.title;
            companyId = projectData.companyId;

            if (resourceData.quantity < quantity) {
                throw new Error(`Not enough stock for ${resourceData.name}. Available: ${resourceData.quantity} kg.`);
            }

            const existingAllocations = projectData.allocatedResources || [];
            if (existingAllocations.some((r: any) => r.resourceId === resourceId)) {
                throw new Error(`${resourceData.name} is already allocated to this project. Please remove it first to adjust the quantity.`);
            }

            transaction.update(resourceRef, {
                quantity: FieldValue.increment(-quantity)
            });

            transaction.update(projectRef, {
                allocatedResources: FieldValue.arrayUnion({
                    resourceId,
                    name: resourceData.name,
                    quantity
                })
            });
        });
        
        await logActivity(companyId, `${actorName} allocated ${quantity}kg of ${resourceName} to project "${projectName}".`);
        revalidatePath('/planning');
        revalidatePath('/resources');

        return { success: true };
    } catch (error: any) {
        console.error("Error allocating resource:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}


export async function deallocateResourceFromProject(input: DeallocateResourceInput, actorName: string) {
    try {
        const { projectId, resourceId } = DeallocateResourceInputSchema.parse(input);
        const projectRef = adminDb.collection('projects').doc(projectId);
        const resourceRef = adminDb.collection('resources').doc(resourceId);
        
        let resourceToDeallocate: any;
        let projectName = "Unknown Project";
        let companyId = "";

        await adminDb.runTransaction(async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists) throw new Error("Project not found.");
            
            const projectData = projectDoc.data()!;
            const allocatedResources = projectData.allocatedResources || [];
            resourceToDeallocate = allocatedResources.find((r: any) => r.resourceId === resourceId);

            projectName = projectData.title;
            companyId = projectData.companyId;

            if (!resourceToDeallocate) {
                throw new Error("Resource was not found in this project's allocations.");
            }

            transaction.update(resourceRef, {
                quantity: FieldValue.increment(resourceToDeallocate.quantity)
            });

            transaction.update(projectRef, {
                allocatedResources: FieldValue.arrayRemove(resourceToDeallocate)
            });
        });
        
        if (resourceToDeallocate) {
          await logActivity(companyId, `${actorName} deallocated ${resourceToDeallocate.name} from project "${projectName}".`);
        }

        revalidatePath('/planning');
        revalidatePath('/resources');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deallocating resource:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
