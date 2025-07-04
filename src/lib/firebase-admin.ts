'use server';

import * as admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let app: App;

if (getApps().length === 0) {
    // Check for a common typo to provide a more helpful error.
    if (process.env.FIREBASE_SDK_CONFIG && !process.env.FIREBASE_ADMIN_SDK_CONFIG) {
        throw new Error(`Incorrect environment variable set.
        You have set FIREBASE_SDK_CONFIG, but the Admin SDK requires FIREBASE_ADMIN_SDK_CONFIG.
        Please rename the variable in your .env.local file to FIREBASE_ADMIN_SDK_CONFIG.
        This is for server-side authentication and is different from the client-side Firebase config.`);
    }

    if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
            app = initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e: any) {
             console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e.message);
             throw new Error(`The FIREBASE_ADMIN_SDK_CONFIG environment variable is not a valid JSON object.
             
             How to fix:
             1. Please check your .env.local file.
             2. Ensure the entire JSON object you copied from Firebase is enclosed in single quotes.
             Example: FIREBASE_ADMIN_SDK_CONFIG='{...}'
             
             Failing to enclose the value in quotes is a common cause of this error.`);
        }
    } else {
       throw new Error(`Firebase Admin authentication failed.
       This is a server configuration issue. You must set the FIREBASE_ADMIN_SDK_CONFIG environment variable.
       
       How to fix:
       1. Go to your Firebase project settings > "Service accounts".
       2. Click "Generate new private key" to download a JSON file.
       3. Copy the ENTIRE content of that JSON file.
       4. Create a file named ".env.local" in the root of your project (if it doesn't exist).
       5. Add this line to your .env.local file:
          FIREBASE_ADMIN_SDK_CONFIG='<paste the copied JSON content here>'
       6. Restart your development server.
       
       Important: Keep the single quotes around the JSON content.`);
    }
} else {
    app = getApps()[0];
}

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

export { adminAuth, adminDb, FieldValue };
