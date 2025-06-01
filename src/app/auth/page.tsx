
'use client'; 

import { AuthForm } from '@/components/auth/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react'; 

function SearchParamsComponent() {
  const searchParams = useSearchParams();
  const myParam = searchParams.get('myParam');

  // This component is just for demonstrating useSearchParams if needed on this page
  // It can be removed if not actively used.
  // return (
  //   myParam ? <div className="text-xs text-muted-foreground mb-2">Param: {myParam}</div> : null
  // );
  return null; // Not actively using params for display currently
}

export default function AuthPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to EagleEyED<sup>TM</sup></CardTitle>
          <CardDescription className="text-md">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <SearchParamsComponent />
          </Suspense>
          <Suspense fallback={<div>Loading authentication form...</div>}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
