'use server';

import { z } from 'zod';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin';
import { SignUpUserInputSchema, type SignUpUserInput, type SignUpUserOutput } from '@/lib/schemas';
import { logActivity } from './activity.actions';


export async function signUpUser(input: SignUpUserInput): Promise<SignUpUserOutput> {
    try {
        const validatedInput = SignUpUserInputSchema.parse(input);

        const companiesRef = adminDb.collection("companies");
        const companyQuery = companiesRef.where("name", "==", validatedInput.companyName.trim());
        const companyQuerySnapshot = await companyQuery.get();

        if (!companyQuerySnapshot.empty) {
            return { success: false, error: "A company with this name already exists. Please choose a different name or log in." };
        }

        const userRecord = await adminAuth.createUser({
            email: validatedInput.email,
            password: validatedInput.password,
            displayName: validatedInput.fullName,
        });

        const batch = adminDb.batch();

        const newCompanyRef = adminDb.collection('companies').doc();
        batch.set(newCompanyRef, {
            name: validatedInput.companyName.trim(),
            createdAt: FieldValue.serverTimestamp(),
            ownerId: userRecord.uid,
        });

        const userDocRef = adminDb.collection('users').doc(userRecord.uid);
        batch.set(userDocRef, {
            uid: userRecord.uid,
            displayName: validatedInput.fullName,
            email: validatedInput.email,
            companyId: newCompanyRef.id,
            role: 'Admin',
            createdAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        await logActivity(newCompanyRef.id, `${validatedInput.fullName} created the company account for "${validatedInput.companyName}".`);

        return { success: true };

    } catch (error: any) {
        console.error("Error in signUpUser server action:", error);
       
        if (error instanceof z.ZodError) {
             return { success: false, error: "Validation failed." };
        }
       
        let errorMessage = 'An unknown error occurred during sign up.';
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'This email address is already in use by another account.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
