
'use server';

import { z } from 'zod';
import { adminDb, FieldValue, adminStorage } from '@/lib/firebase-admin';
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
  AddFileToProjectInputSchema,
  DeleteFileFromProjectInputSchema,
  AddFileToTaskInputSchema,
  DeleteFileFromTaskInputSchema,
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
  type AddFileToProjectInput,
  type DeleteFileFromProjectInput,
  type AddFileToTaskInput,
  type DeleteFileFromTaskInput,
  type Task,
  type ProjectFile,
} from '@/lib/schemas';
import { logActivity } from './activity.actions';
import { createNotificationsForTeam } from './notification.actions';

const getProjectAndValidate = async (projectId: string) => {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error("Project not found.");
    return { ref: projectRef, data: projectDoc.data()! };
}

// Helper to normalize the tasks array, converting all Timestamps to JS Dates
const normalizeTasksArray = (tasks: any[]): Task[] => {
    if (!tasks) return [];
    return tasks.map(task => {
        const deadline = task.deadline;
        // Check if it's a Firestore Timestamp and convert, otherwise leave as is (Date or null)
        const normalizedDeadline = deadline && typeof deadline.toDate === 'function' ? deadline.toDate() : deadline;
        
        const files = task.files || [];
        const normalizedFiles = files.map((file: any) => {
             const uploadedAt = file.uploadedAt;
             const normalizedUploadedAt = uploadedAt && typeof uploadedAt.toDate === 'function' ? uploadedAt.toDate() : uploadedAt;
             return {...file, uploadedAt: normalizedUploadedAt };
        });

        // The Task type from schemas expects JS dates, so we return a compliant object
        return { ...task, deadline: normalizedDeadline, files: normalizedFiles };
    });
};


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
            team: [],
            tasks: [],
            files: [],
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

export async function addTaskToProject(input: AddTaskInput, actor: { uid: string, displayName: string }) {
    try {
        const { projectId, ...taskData } = AddTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const newTask: Task = {
            id: adminDb.collection('projects').doc().id,
            title: taskData.title,
            assignedTo: taskData.assignedTo,
            deadline: taskData.deadline,
            status: 'To Do',
            files: [],
        };
        
        const existingTasks = data.tasks || [];
        const mixedTasks = [...existingTasks, newTask];
        const normalizedTasks = normalizeTasksArray(mixedTasks);

        const { progress, team } = recalculateProgressAndTeam(normalizedTasks);

        await ref.update({
            tasks: normalizedTasks,
            team: team,
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await logActivity(data.companyId, `${actor.displayName} added task "${newTask.title}" to project "${data.title}".`);
        await createNotificationsForTeam(
            newTask.assignedTo, 
            `${actor.displayName} assigned you a new task in project "${data.title}": ${newTask.title}`, 
            `/projects#${projectId}`,
            actor.uid
        );
        revalidatePath('/projects');
        revalidatePath('/');

        return { success: true };
    } catch (error: any) {
        console.error("Error adding task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateTask(input: UpdateTaskInput, actor: { uid: string, displayName: string }) {
    try {
        const { projectId, taskId, ...updateData } = UpdateTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const tasksFromDb: any[] = data.tasks || [];
        const originalTask = tasksFromDb.find((task) => task.id === taskId);
        if (!originalTask) throw new Error("Task not found in project.");

        let taskUpdated = false;
        const mixedTasks = tasksFromDb.map((task) => {
            if (task.id === taskId) {
                taskUpdated = true;
                return { ...task, ...updateData };
            }
            return task;
        });

        if (!taskUpdated) throw new Error("Task not found in project.");
        
        const normalizedTasks = normalizeTasksArray(mixedTasks);
        
        const { progress, team } = recalculateProgressAndTeam(normalizedTasks);

        await ref.update({
            tasks: normalizedTasks,
            team: team,
            progress: progress,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updatedTask = normalizedTasks.find(t => t.id === taskId)!;
        await logActivity(data.companyId, `${actor.displayName} updated task "${updatedTask.title}" in project "${data.title}".`);
        
        if (updateData.assignedTo) {
            const originalAssignees = new Set(originalTask.assignedTo);
            const newAssignees = updateData.assignedTo.filter(userId => !originalAssignees.has(userId));
            if (newAssignees.length > 0) {
                await createNotificationsForTeam(
                    newAssignees, 
                    `${actor.displayName} assigned you to the task "${updatedTask.title}" in project "${data.title}".`, 
                    `/projects#${projectId}`,
                    actor.uid
                );
            }
        }
        
        if (updateData.status && updateData.status !== originalTask.status) {
             await createNotificationsForTeam(
                 updatedTask.assignedTo,
                 `The status of task "${updatedTask.title}" in project "${data.title}" was updated to "${updateData.status}".`, 
                 `/projects#${projectId}`, 
                 actor.uid
            );
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

        const tasksFromDb: any[] = data.tasks || [];
        const taskToDelete = tasksFromDb.find((t) => t.id === taskId);
        if (!taskToDelete) throw new Error("Task not found.");

        const remainingTasks = tasksFromDb.filter((t) => t.id !== taskId);
        const normalizedTasks = normalizeTasksArray(remainingTasks);
        
        const { progress, team } = recalculateProgressAndTeam(normalizedTasks);

        await ref.update({
            tasks: normalizedTasks,
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


export async function addFileToProject(input: AddFileToProjectInput, actorName: string) {
    try {
        const { projectId, file, uploaderName } = AddFileToProjectInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const newFile: ProjectFile = { ...file, uploaderName, uploadedAt: new Date() };

        await ref.update({ files: FieldValue.arrayUnion(newFile) });
        await logActivity(data.companyId, `${actorName} uploaded file "${file.name}" to project "${data.title}".`);
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        console.error("Error adding file to project:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteFileFromProject(input: DeleteFileFromProjectInput, actorName: string) {
    try {
        const { projectId, fileId } = DeleteFileFromProjectInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        const fileToDelete = (data.files || []).find((f: ProjectFile) => f.id === fileId);
        if (!fileToDelete) throw new Error("File not found in project.");

        const fileRef = adminStorage.bucket().file(`projects/${projectId}/${fileId}-${fileToDelete.name}`);
        await fileRef.delete({ ignoreNotFound: true });

        await ref.update({ files: FieldValue.arrayRemove(fileToDelete) });
        await logActivity(data.companyId, `${actorName} deleted file "${fileToDelete.name}" from project "${data.title}".`);
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting file from project:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function addFileToTask(input: AddFileToTaskInput, actorName: string) {
    try {
        const { projectId, taskId, file, uploaderName } = AddFileToTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        let taskUpdated = false;
        const newFile: ProjectFile = { ...file, uploaderName, uploadedAt: new Date() };
        
        const updatedTasks = (data.tasks || []).map((task: Task) => {
            if (task.id === taskId) {
                taskUpdated = true;
                const taskFiles = task.files || [];
                return { ...task, files: [...taskFiles, newFile] };
            }
            return task;
        });

        if (!taskUpdated) throw new Error("Task not found in project.");
        
        const normalizedTasks = normalizeTasksArray(updatedTasks);

        await ref.update({ tasks: normalizedTasks, updatedAt: FieldValue.serverTimestamp() });

        const task = normalizedTasks.find(t => t.id === taskId);
        await logActivity(data.companyId, `${actorName} uploaded file "${file.name}" to task "${task!.title}" in project "${data.title}".`);
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        console.error("Error adding file to task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function deleteFileFromTask(input: DeleteFileFromTaskInput, actorName: string) {
    try {
        const { projectId, taskId, fileId } = DeleteFileFromTaskInputSchema.parse(input);
        const { ref, data } = await getProjectAndValidate(projectId);

        let taskUpdated = false;
        let fileToDelete: ProjectFile | undefined;
        let taskTitle = '';

        const updatedTasks = (data.tasks || []).map((task: Task) => {
            if (task.id === taskId) {
                taskTitle = task.title;
                const originalFiles = task.files || [];
                fileToDelete = originalFiles.find(f => f.id === fileId);
                if (fileToDelete) {
                    taskUpdated = true;
                    return { ...task, files: originalFiles.filter(f => f.id !== fileId) };
                }
            }
            return task;
        });

        if (!taskUpdated || !fileToDelete) throw new Error("File not found in task.");
        
        const fileRef = adminStorage.bucket().file(`projects/${projectId}/tasks/${taskId}/${fileId}-${fileToDelete.name}`);
        await fileRef.delete({ ignoreNotFound: true });
        
        const normalizedTasks = normalizeTasksArray(updatedTasks);
        await ref.update({ tasks: normalizedTasks, updatedAt: FieldValue.serverTimestamp() });
        
        await logActivity(data.companyId, `${actorName} deleted file "${fileToDelete.name}" from task "${taskTitle}" in project "${data.title}".`);
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting file from task:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

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

        let resourceName = "Unknown Resource", projectName = "Unknown Project", companyId = "", resourceUnit = "units";

        await adminDb.runTransaction(async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            const projectDoc = await transaction.get(projectRef);

            if (!resourceDoc.exists) throw new Error("Resource not found.");
            if (!projectDoc.exists) throw new Error("Project not found.");

            const resourceData = resourceDoc.data()!;
            const projectData = projectDoc.data()!;
            
            resourceName = resourceData.name; 
            projectName = projectData.title; 
            companyId = projectData.companyId;
            resourceUnit = resourceData.unit;

            if (resourceData.quantity < quantity) throw new Error(`Not enough stock for ${resourceData.name}. Available: ${resourceData.quantity} ${resourceUnit}.`);
            if ((projectData.allocatedResources || []).some((r: any) => r.resourceId === resourceId)) throw new Error(`${resourceData.name} is already allocated. Please remove it first to adjust.`);

            transaction.update(resourceRef, { quantity: FieldValue.increment(-quantity) });
            transaction.update(projectRef, { allocatedResources: FieldValue.arrayUnion({ resourceId, name: resourceData.name, quantity, unit: resourceUnit }) });
        });
        
        await logActivity(companyId, `${actorName} allocated ${quantity} ${resourceUnit} of ${resourceName} to project "${projectName}".`);
        revalidatePath('/projects');
        revalidatePath('/resources');
        revalidatePath('/');

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
          await logActivity(companyId, `${actorName} deallocated ${resourceToDeallocate.quantity} ${resourceToDeallocate.unit} of ${resourceToDeallocate.name} from project "${projectName}".`);
        }

        revalidatePath('/projects');
        revalidatePath('/resources');
        revalidatePath('/');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deallocating resource:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
