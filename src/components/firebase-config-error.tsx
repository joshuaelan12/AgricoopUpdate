'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function FirebaseConfigError({ onTryAgain }: { onTryAgain?: () => void }) {
    const handleTryAgain = () => {
        if (onTryAgain) {
            onTryAgain();
        } else {
            // Fallback for when the component is rendered outside an error boundary
            window.location.reload();
        }
    }
  return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="mx-auto max-w-2xl w-full">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                    <div>
                        <CardTitle className="text-2xl font-headline text-destructive">Action Required: Configure Firebase</CardTitle>
                        <CardDescription>Your application is missing its Firebase configuration.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <p>To run this application, you need to provide your Firebase project's client-side keys. Don't worry, it's a straightforward process.</p>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                            <div className="h-full w-px bg-border my-1"></div>
                        </div>
                        <div>
                            <h3 className="font-semibold">Create a `.env.local` file</h3>
                            <p className="text-muted-foreground">In the root directory of your project, create a new file named exactly <code>.env.local</code>.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                            <div className="h-full w-px bg-border my-1"></div>
                        </div>
                        <div>
                            <h3 className="font-semibold">Copy the Environment Variables</h3>
                            <p className="text-muted-foreground">Copy the content below into your new <code>.env.local</code> file.</p>
                            <pre className="mt-2 w-full whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm font-mono">
                                {`NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_PROJECT_ID.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_PROJECT_ID.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"`}
                            </pre>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                            <div className="h-full w-px bg-border my-1"></div>
                        </div>
                         <div>
                            <h3 className="font-semibold">Find Your Keys in Firebase</h3>
                            <p className="text-muted-foreground">Go to your Firebase project settings. Under the "General" tab, scroll down to "Your apps". Select your web app and find the configuration object. Replace the "YOUR_..." placeholders with your actual credentials.</p>
                        </div>
                    </div>

                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</div>
                        </div>
                        <div>
                            <h3 className="font-semibold">Restart the Application</h3>
                            <p className="text-muted-foreground">After saving the file, you must restart your development server for the changes to take effect.</p>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Button onClick={handleTryAgain}>
                        I've configured it, try again
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
  );
}
