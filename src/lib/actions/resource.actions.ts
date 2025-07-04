'use server';

import { z } from 'zod';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { CreateResourceInputSchema, type CreateResourceInput } from '@/lib/schemas';

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
