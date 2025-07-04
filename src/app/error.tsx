'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import FirebaseConfigError from '@/components/firebase-config-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const isFirebaseConfigError = error.message.includes('Firebase client configuration is missing');

  if (isFirebaseConfigError) {
    return <FirebaseConfigError onTryAgain={reset} />;
  }

  // Generic fallback error
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="mx-auto max-w-lg w-full text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive rounded-full p-3 w-fit">
                    <AlertTriangle className="h-8 w-8 text-destructive-foreground" />
                </div>
                <CardTitle className="mt-4 text-2xl font-headline">Something went wrong!</CardTitle>
                <CardDescription>An unexpected error occurred. Please try again.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => reset()}>
                    Try again
                </Button>
            </CardContent>
        </Card>
    </div>
  )
}
