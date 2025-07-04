'use server';

import { adminDb, FieldValue } from '@/lib/firebase-admin';

/**
 * Creates notifications for a list of user IDs.
 * @param team Array of user IDs to notify.
 * @param message The notification message.
 * @param link The URL link for the notification.
 * @param excludeUserId Optional user ID to exclude from receiving the notification.
 */
export async function createNotificationsForTeam(team: string[], message: string, link: string, excludeUserId?: string) {
    if (!team || team.length === 0) {
        return;
    }

    try {
        const batch = adminDb.batch();
        const notificationsRef = adminDb.collection('notifications');
        
        team.forEach(userId => {
            // Ensure we don't notify the user who triggered the action
            if (userId !== excludeUserId) {
                const notificationRef = notificationsRef.doc();
                batch.set(notificationRef, {
                    userId,
                    message,
                    link: link || '#',
                    isRead: false,
                    timestamp: FieldValue.serverTimestamp(),
                });
            }
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Failed to create notifications:", error);
        // This is a non-critical side effect, so we don't throw an error
        // that would interrupt the user's primary action.
    }
}
