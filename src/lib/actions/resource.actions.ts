'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateResourceInputSchema, UpdateResourceInputSchema, type CreateResourceInput, type UpdateResourceInput } from '@/lib/schemas';

export async function createResource(input: CreateResourceInput) {
    try {
        const validatedInput = CreateResourceInputSchema.parse(input);

        const newResourceRef = adminDb.collection('resources').doc();
        
        await newResourceRef.set({
            ...validatedInput,
            createdAt: FieldValue.serverTimestamp(),
        });
        
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

export async function updateResource(input: UpdateResourceInput) {
    try {
        const validatedInput = UpdateResourceInputSchema.parse(input);
        const { id, ...updateData } = validatedInput;

        const resourceRef = adminDb.collection('resources').doc(id);
        
        await resourceRef.update({
            ...updateData,
            updatedAt: FieldValue.serverTimestamp(),
        });
        
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
