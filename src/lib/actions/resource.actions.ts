'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateResourceInputSchema, UpdateResourceInputSchema, type CreateResourceInput, type UpdateResourceInput } from '@/lib/schemas';
import { logActivity } from './activity.actions';

export async function createResource(input: CreateResourceInput, actorName: string) {
    try {
        const validatedInput = CreateResourceInputSchema.parse(input);

        const newResourceRef = adminDb.collection('resources').doc();
        
        await newResourceRef.set({
            ...validatedInput,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(validatedInput.companyId, `${actorName} added a new resource: "${validatedInput.name}".`);
        revalidatePath('/resources');
        
        return { success: true, resourceId: newResourceRef.id };

    } catch (error: any) {
        console.error("Error creating resource:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}

export async function updateResource(input: UpdateResourceInput, actorName: string) {
    try {
        const validatedInput = UpdateResourceInputSchema.parse(input);
        const { id, ...updateData } = validatedInput;

        const resourceRef = adminDb.collection('resources').doc(id);
        const resourceDoc = await resourceRef.get();
        if (!resourceDoc.exists) throw new Error("Resource not found.");
        const companyId = resourceDoc.data()!.companyId;
        
        await resourceRef.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
        await logActivity(companyId, `${actorName} updated the details for resource "${validatedInput.name}".`);
        revalidatePath('/resources');
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating resource:", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: "Validation failed.", issues: error.flatten() };
        }
        return { success: false, error: error.message || "An unknown error occurred." };
    }
}
