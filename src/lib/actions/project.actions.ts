'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import {
  CreateProjectInputSchema,
  AddProjectCommentInputSchema,
  DeleteProjectCommentInputSchema,
  UpdateProjectInputSchema,
  DeleteProjectInputSchema,
  AddProjectOutputInputSchema,
  DeleteProjectOutputInputSchema,
  AllocateResourceInputSchema,
  DeallocateResourceInputSchema,
  AddTaskInputSchema,
  UpdateTaskInputSchema,
  DeleteTaskInputSchema,
  type CreateProjectInput,
  type AddProjectCommentInput,
  type DeleteProjectCommentInput,
  type UpdateProjectInput,
  type DeleteProjectInput,
  type AddProjectOutputInput,
  type DeleteProjectOutputInput,
  type AllocateResourceInput,
  type DeallocateResourceInput,
  type AddTaskInput,
  type UpdateTaskInput,
  type DeleteTaskInput,
  type Task,
} from '@/lib/schemas';
import { logActivity } from './activity.actions';
import { createNotificationsForTeam } from './notification.actions';

const getProjectAndValidate = async (projectId: string) => {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error("Project not found.");
    return { ref: projectRef, data: projectDoc.data()! };
}

const recalculateProgressAndTeam = (tasks: Task[]) => {
    const totalTasks = tasks.length;
    if (totalTasks === 0) {
        return { progress: 0, team: [] };
    }
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const progress = Math.round((completedTasks / totalTasks) * 100);
    const team = [...new Set(tasks.flatMap(t => t.assignedTo))];
    return { progress, team };
};

export async function createProject(input: CreateProjectInput, actorName: string) {
    try {
        const validatedInput = CreateProjectInputSchema.parse(input);

        const newProjectRef = adminDb.collection('projects').doc();

        await newProjectRef.set({
            ...validatedInput,
            progress: 0,
            tasks: [],
            team: [],
            comments: [],
            outputs: [],
            allocatedResources: [],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await logActivity(validatedInput.companyId, `${actorName} created a new project: "${validatedInput.title}".`);
        revalidatePath('/projects');
        revalidatePath('/');

        return { success: true, projectId: newProjectRef.id };

    } catch (error: any) {
        console.error("Error creating project:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateProject(input: UpdateProjectInput, actorName: string) {
    try {
        const { projectId, ...updateData } = UpdateProjectInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        await ref.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await logActivity(data.companyId, `${actorName} updated the details for project "${data.title}".`);
        revalidatePath('/projects');

        return { success: true };
    } catch (error: any) {
        console.error("Error updating project:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteProject(input: DeleteProjectInput, actorName: string) {
    try {
        const { projectId } = DeleteProjectInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);
        
        await ref.delete();
        
        await logActivity(data.companyId, `${actorName} deleted project "${data.title}".`);
        revalidatePath('/projects');
        revalidatePath('/');
        
        return { success: true };
    } catch (error: any)
    {
        console.error("Error deleting project:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function addTaskToProject(input: AddTaskInput, actorName: string) {
    try {
        const { projectId, ...taskData } = AddTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const newTask: Task = {
            id: adminDb.collection('projects').doc().id,
            title: taskData.title,
            assignedTo: taskData.assignedTo,
            deadline: taskData.deadline,
            status: 'To Do',
        };

        const updatedTasks = [...(data.tasks || []), newTask];
        const { progress, team } = recalculateProgressAndTeam(updatedTasks);

        await ref.update({
            tasks: updatedTasks,
            team: team,
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await logActivity(data.companyId, `${actorName} added task "${newTask.title}" to project "${data.title}".`);
        await createNotificationsForTeam(newTask.assignedTo, `${actorName} assigned you a new task in project "${data.title}": ${newTask.title}`, `/projects#${projectId}`);
        revalidatePath('/projects');
        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error("Error adding task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateTask(input: UpdateTaskInput, actorName: string) {
    try {
        const { projectId, taskId, ...updateData } = UpdateTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        let taskUpdated = false;
        const updatedTasks = (data.tasks || []).map((task: Task) => {
            if (task.id === taskId) {
                taskUpdated = true;
                return { ...task, ...updateData };
            }
            return task;
        });

        if (!taskUpdated) throw new Error("Task not found in project.");
        
        const { progress, team } = recalculateProgressAndTeam(updatedTasks);

        await ref.update({
            tasks: updatedTasks,
            team: team,
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updatedTask = updatedTasks.find(t => t.id === taskId);
        await logActivity(data.companyId, `${actorName} updated task "${updatedTask.title}" in project "${data.title}".`);
        if (updateData.status) {
             await createNotificationsForTeam(data.team, `Task "${updatedTask.title}" in project "${data.title}" was updated to "${updateData.status}"`, `/projects#${projectId}`, actorName);
        }
        
        revalidatePath('/projects');
        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error("Error updating task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteTask(input: DeleteTaskInput, actorName: string) {
    try {
        const { projectId, taskId } = DeleteTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const taskToDelete = data.tasks.find((t: Task) => t.id === taskId);
        if (!taskToDelete) throw new Error("Task not found.");

        const updatedTasks = data.tasks.filter((t: Task) => t.id !== taskId);
        const { progress, team } = recalculateProgressAndTeam(updatedTasks);

        await ref.update({
            tasks: updatedTasks,
            team: team,
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(data.companyId, `${actorName} deleted task "${taskToDelete.title}" from project "${data.title}".`);
        revalidatePath('/projects');
        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function addProjectComment(input: AddProjectCommentInput) {
    try {
        const { projectId, commentText, userId, userName } = AddProjectCommentInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const newComment = {
            id: adminDb.collection('projects').doc().id,
            text: commentText,
            authorId: userId,
            authorName: userName,
            createdAt: new Date(),
        };

        await ref.update({ comments: FieldValue.arrayUnion(newComment) });

        await logActivity(data.companyId, `${userName} commented on project "${data.title}".`);
        await createNotificationsForTeam(data.team,`${userName} commented on project "${data.title}".`, `/projects#${projectId}`, userId);
        revalidatePath('/projects');

        return { success: true };
    } catch (error: any) {
        console.error("Error adding comment:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteProjectComment(input: DeleteProjectCommentInput) {
    try {
        const { projectId, commentId, userId } = DeleteProjectCommentInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);
        
        const commentToDelete = (data.comments || []).find((c: any) => c.id === commentId);
        if (!commentToDelete) throw new Error("Comment not found.");
        if (commentToDelete.authorId !== userId) throw new Error("You do not have permission to delete this comment.");

        await ref.update({ comments: FieldValue.arrayRemove(commentToDelete) });

        await logActivity(data.companyId, `${commentToDelete.authorName} deleted a comment from project "${data.title}".`);
        revalidatePath('/projects');

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting comment:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

// --- OTHER ACTIONS (UNCHANGED BUT KEEPING FOR CONTEXT) ---

export async function addProjectOutput(input: AddProjectOutputInput, actorName: string) {
    try {
        const { projectId, description, quantity, unit } = AddProjectOutputInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const newOutput = {
            id: adminDb.collection('projects').doc().id,
            description, quantity, unit, date: new Date(),
        };

        await ref.update({ outputs: FieldValue.arrayUnion(newOutput) });
        await logActivity(data.companyId, `${actorName} logged a new output for project "${data.title}": ${quantity} ${unit} of ${description}.`);
        revalidatePath('/outputs');
        return { success: true };
    } catch (error: any) {
        console.error("Error adding project output:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteProjectOutput(input: DeleteProjectOutputInput, actorName: string) {
    try {
        const { projectId, outputId } = DeleteProjectOutputInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const outputToDelete = (data.outputs || []).find((o: any) => o.id === outputId);
        if (!outputToDelete) throw new Error("Output record not found.");

        await ref.update({ outputs: FieldValue.arrayRemove(outputToDelete) });
        await logActivity(data.companyId, `${actorName} removed an output log from project "${data.title}": ${outputToDelete.quantity} ${outputToDelete.unit} of ${outputToDelete.description}.`);
        revalidatePath('/outputs');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting project output:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function allocateResourceToProject(input: AllocateResourceInput, actorName: string) {
    try {
        const { projectId, resourceId, quantity } = AllocateResourceInputSchema.parse(input);
        const projectRef = adminDb.collection('projects').doc(projectId);
        const resourceRef = adminDb.collection('resources').doc(resourceId);

        let resourceName = "Unknown Resource", projectName = "Unknown Project", companyId = "";

        await adminDb.runTransaction(async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            const projectDoc = await transaction.get(projectRef);

            if (!resourceDoc.exists) throw new Error("Resource not found.");
            if (!projectDoc.exists) throw new Error("Project not found.");

            const resourceData = resourceDoc.data()!;
            const projectData = projectDoc.data()!;
            
            resourceName = resourceData.name; projectName = projectData.title; companyId = projectData.companyId;

            if (resourceData.quantity < quantity) throw new Error(`Not enough stock for ${resourceData.name}. Available: ${resourceData.quantity} kg.`);
            if ((projectData.allocatedResources || []).some((r: any) => r.resourceId === resourceId)) throw new Error(`${resourceData.name} is already allocated. Please remove it first to adjust.`);

            transaction.update(resourceRef, { quantity: FieldValue.increment(-quantity) });
            transaction.update(projectRef, { allocatedResources: FieldValue.arrayUnion({ resourceId, name: resourceData.name, quantity }) });
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
        
        let resourceToDeallocate: any, projectName = "Unknown Project", companyId = "";

        await adminDb.runTransaction(async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists) throw new Error("Project not found.");
            
            const projectData = projectDoc.data()!;
            resourceToDeallocate = (projectData.allocatedResources || []).find((r: any) => r.resourceId === resourceId);
            projectName = projectData.title; companyId = projectData.companyId;

            if (!resourceToDeallocate) throw new Error("Resource was not found in this project's allocations.");

            transaction.update(resourceRef, { quantity: FieldValue.increment(resourceToDeallocate.quantity) });
            transaction.update(projectRef, { allocatedResources: FieldValue.arrayRemove(resourceToDeallocate) });
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
