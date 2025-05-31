'use client'; // Added this line

import { AuthForm } from '@/components/auth/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react'; // Ensure Suspense is imported

function SearchParamsComponent() {
  const searchParams = useSearchParams();
  const myParam = searchParams.get('myParam');

  return (
    <div>
      My parameter is: {myParam}
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to EagleEyED</CardTitle>
          <CardDescription className="text-md">
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Wrapped SearchParamsComponent with Suspense */}
          <Suspense fallback={<div>Loading search params...</div>}>
            <SearchParamsComponent />
          </Suspense>
          {/* Wrapped AuthForm with Suspense */}
          <Suspense fallback={<div>Loading authentication form...</div>}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
