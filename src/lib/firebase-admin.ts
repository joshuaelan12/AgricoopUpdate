'use server';

import * as admin from 'firebase-admin';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = (): App => {
    // Return existing app if already initialized
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Check for the configuration environment variable
    if (process.env.FIREBASE_ADMIN_SDK_CONFIG) {
        try {
            // Parse the service account JSON from the environment variable
            const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);
            
            // Initialize the app with the credentials
            return initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e: any) {
            console.error("Failed to parse FIREBASE_ADMIN_SDK_CONFIG:", e.message);
            throw new Error("The FIREBASE_ADMIN_SDK_CONFIG environment variable is not a valid JSON object. Please check your .env.local file.");
        }
    } else {
       // Provide a very clear error message if the variable is missing
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
};

let app: App;
let adminAuth: ReturnType<typeof getAuth>;
let adminDb: ReturnType<typeof getFirestore>;

try {
    app = initializeFirebaseAdmin();
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
} catch (error: any) {
    // This allows the app to build but will throw the detailed error when an action is called.
    console.error("Failed to initialize Firebase Admin SDK during module load:", error.message);
    const errorMessage = error.message;
    const throwError = () => { throw new Error(errorMessage); };
    adminAuth = { createUser: throwError } as any;
    adminDb = { collection: throwError } as any;
}


export { adminAuth, adminDb };
