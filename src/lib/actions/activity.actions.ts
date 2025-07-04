'use server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export async function logActivity(companyId: string, message: string) {
    if (!companyId || !message) {
        // Avoid logging if essential information is missing
        return;
    }
    try {
        await adminDb.collection('activity_logs').add({
            companyId,
            message,
            timestamp: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
        // This is a non-critical side effect, so we don't throw an error
        // that would interrupt the user's primary action.
    }
}
