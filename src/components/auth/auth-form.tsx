
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Mail, KeyRound, Smartphone, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// Schemas
const emailPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});
type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Invalid phone number' }), // Basic validation
});
type PhoneFormData = z.infer<typeof phoneSchema>;

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits' }),
});
type OtpFormData = z.infer<typeof otpSchema>;


// SVG Icons for Social Providers
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
    <path fill="#EA4335" d="M24 9.5c3.438 0 6.338 1.163 8.625 3.313l6.563-6.563C34.963 2.788 29.888 1 24 1 14.475 1 6.45 6.6 3.038 14.563L10.35 20.1C12.263 13.838 17.663 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24c0-1.688-.15-3.313-.438-4.875H24v9.15h12.938c-.563 3-2.25 5.438-4.813 7.125l7.313 5.663C43.513 36.638 46.5 30.825 46.5 24z"/>
    <path fill="#FBBC05" d="M10.35 20.094C9.825 21.656 9.5 23.313 9.5 25s.325 3.344.85 4.906l-7.312 5.663C1.163 32.25 0 28.781 0 25s1.163-7.25 3.038-10.563L10.35 20.094z"/>
    <path fill="#34A853" d="M24 47c5.888 0 10.963-1.938 14.625-5.25l-7.313-5.663c-1.913 1.288-4.35 2.063-7.313 2.063-6.338 0-11.738-4.338-13.65-10.594L2.963 33.125C6.375 41.038 14.475 47 24 47z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22px" height="22px">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
);

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px">
    <path d="M19.05,14.36c-.05-.03-2.15-1.19-2.15-3.83,0-2.23,1.61-3.43,1.82-3.61a.88.88,0,0,0,.16-.72.91.91,0,0,0-.63-.61c-.22-.07-1.19-.32-2.39.62-.93.73-1.55,1.86-1.91,2.77-.6.06-1.26.06-1.92.06-1.3,0-2.55-.33-3.63-1.05-.93-.63-1.58-1.04-2.64-1.05-1.29,0-2.42.7-3.23,1.69-.18.22-.35.45-.51.69-1.09,1.61-.81,4.46.69,6.16.89,1,1.9,2.07,3.29,2.07s1.93-.78,2.61-1.21c.75-.47,1.38-.91,2.54-.91s1.53.34,2.28.83c.81.53,1.61,1.31,2.81,1.19.24,0,.48,0,.7-.05.1-.02.2-.04.3-.06.19-.05.38-.1.57-.17,1.1-.44,1.45-1.61,1.47-1.65C20.41,17.08,19.05,14.36,19.05,14.36ZM14.81,4.39c.79-.94,1.25-2.23.92-3.39-.84.09-1.9.63-2.73,1.55-.68.77-1.22,2.06-1,3.16C13.06,5.79,14.06,5.28,14.81,4.39Z" />
  </svg>
);


export function AuthForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTab, setCurrentTab] = useState("login");

  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);


  const {
    register: registerEmailPassword,
    handleSubmit: handleSubmitEmailPassword,
    formState: { errors: emailPasswordErrors },
    reset: resetEmailPasswordForm,
  } = useForm<EmailPasswordFormData>({
    resolver: zodResolver(emailPasswordSchema),
  });

  const {
    register: registerPhone,
    handleSubmit: handleSubmitPhone,
    formState: { errors: phoneErrors },
    reset: resetPhoneForm,
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const {
    register: registerOtp,
    handleSubmit: handleSubmitOtp,
    formState: { errors: otpErrors },
    reset: resetOtpForm,
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });


  useEffect(() => {
    if (!authLoading && user) {
      router.push('/'); // Redirect if already logged in
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Initialize reCAPTCHA for phone auth when the tab is active and phone step is 'input'
    if (currentTab === 'phone' && phoneStep === 'input' && recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
         // Ensure reCAPTCHA script is loaded
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible', // can also be 'normal'
            'callback': (response: any) => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
            },
            'expired-callback': () => {
              // Response expired. Ask user to solve reCAPTCHA again.
              toast({ variant: "destructive", title: "reCAPTCHA expired", description: "Please try sending the OTP again." });
              resetRecaptcha();
            }
          });
          recaptchaVerifierRef.current.render().catch(err => {
             console.error("Recaptcha render error:", err);
             setError("Failed to render reCAPTCHA. Please refresh.");
          });
      } else {
        console.warn("reCAPTCHA script not loaded yet.");
        // Optionally, try again after a short delay or prompt user to refresh
      }
    }
    // Cleanup reCAPTCHA on unmount or when tab/step changes
    return () => {
      resetRecaptcha();
    };
  }, [currentTab, phoneStep]);

  const resetRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
        // Attempt to clear the reCAPTCHA widget
        const widgetId = recaptchaVerifierRef.current.widgetId;
        if (typeof widgetId === 'number' && window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
            try {
                window.grecaptcha.reset(widgetId);
            } catch (e) {
                console.warn("Error resetting reCAPTCHA widget:", e);
            }
        }
        recaptchaVerifierRef.current.clear(); // Clear verifier instance
        recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.innerHTML = ''; // Clear the container
    }
  };


  const handleEmailPasswordSubmit = async (data: EmailPasswordFormData, isSignUp: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: "Account Created!", description: "Welcome! You are now logged in." });
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: "Logged In!", description: "Welcome back!" });
      }
      resetEmailPasswordForm();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      toast({ variant: "destructive", title: "Authentication Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerName: 'google' | 'microsoft' | 'apple') => {
    setIsLoading(true);
    setError(null);
    let provider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
    } else if (providerName === 'microsoft') {
      provider = new OAuthProvider('microsoft.com');
      // Optionally add scopes for Microsoft: provider.addScope('user.read');
    } else if (providerName === 'apple') {
      provider = new OAuthProvider('apple.com');
      // Optionally add scopes for Apple: provider.addScope('email'); provider.addScope('name');
    } else {
      setError('Invalid provider');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Logged In!", description: `Successfully signed in with ${providerName}.` });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      toast({ variant: "destructive", title: "Authentication Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!recaptchaVerifierRef.current) {
        throw new Error("reCAPTCHA verifier not initialized.");
      }
      const result = await signInWithPhoneNumber(auth, data.phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setPhoneStep('otp');
      resetPhoneForm();
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
      toast({ variant: "destructive", title: "OTP Error", description: err.message });
      resetRecaptcha(); // Reset reCAPTCHA on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpFormData) => {
    setIsLoading(true);
    setError(null);
    if (!confirmationResult) {
      setError('No OTP confirmation result found. Please try again.');
      setIsLoading(false);
      return;
    }
    try {
      await confirmationResult.confirm(data.otp);
      toast({ title: "Logged In!", description: "Successfully verified phone number." });
      setPhoneStep('input');
      resetOtpForm();
      resetRecaptcha();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
      toast({ variant: "destructive", title: "OTP Verification Failed", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setError(null); // Clear errors when switching tabs
    resetEmailPasswordForm();
    resetPhoneForm();
    resetOtpForm();
    setPhoneStep('input'); // Reset phone auth flow
    resetRecaptcha();
  };

  if (authLoading) {
    return <p className="text-center text-muted-foreground">Loading authentication status...</p>;
  }
  if (user) {
     // This should be handled by useEffect redirect, but as a fallback
    return <p className="text-center text-muted-foreground">Already logged in. Redirecting...</p>;
  }


  return (
    <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange} value={currentTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="login">Email/Password</TabsTrigger>
        <TabsTrigger value="phone">Phone</TabsTrigger>
        <TabsTrigger value="social">Social</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TabsContent value="login">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-6 pt-6">
            {/* Login Form */}
            <form onSubmit={handleSubmitEmailPassword(data => handleEmailPasswordSubmit(data, false))} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-email" type="email" placeholder="you@example.com" {...registerEmailPassword('email')} className="pl-10" />
                </div>
                {emailPasswordErrors.email && <p className="text-sm text-destructive mt-1">{emailPasswordErrors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" {...registerEmailPassword('password')} className="pl-10 pr-10" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {emailPasswordErrors.password && <p className="text-sm text-destructive mt-1">{emailPasswordErrors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <Separator />
            {/* Sign Up Form Trigger (conceptually part of 'login' tab for now, or move to separate section) */}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?
            </p>
            <form onSubmit={handleSubmitEmailPassword(data => handleEmailPasswordSubmit(data, true))} className="space-y-4">
               <div>
                <Label htmlFor="signup-email">Sign Up Email</Label>
                 <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="signup-email" type="email" placeholder="you@example.com" {...registerEmailPassword('email')} className="pl-10" />
                </div>
                {emailPasswordErrors.email && <p className="text-sm text-destructive mt-1">{emailPasswordErrors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-password">Sign Up Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="Create a password" {...registerEmailPassword('password')} className="pl-10 pr-10" />
                   <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {emailPasswordErrors.password && <p className="text-sm text-destructive mt-1">{emailPasswordErrors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" variant="outline" disabled={isLoading}>
                {isLoading ? 'Signing up...' : 'Sign Up with Email'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="phone">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-6 pt-6">
            {phoneStep === 'input' && (
              <form onSubmit={handleSubmitPhone(handleSendOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="phone-number" type="tel" placeholder="+1 123 456 7890" {...registerPhone('phoneNumber')} className="pl-10" />
                  </div>
                  {phoneErrors.phoneNumber && <p className="text-sm text-destructive mt-1">{phoneErrors.phoneNumber.message}</p>}
                </div>
                <div ref={recaptchaContainerRef} id="recaptcha-container" className="my-4"></div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            )}
            {phoneStep === 'otp' && (
              <form onSubmit={handleSubmitOtp(handleVerifyOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code (OTP)</Label>
                   <div className="relative">
                     <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="otp" type="text" placeholder="Enter 6-digit OTP" {...registerOtp('otp')} className="pl-10" />
                  </div>
                  {otpErrors.otp && <p className="text-sm text-destructive mt-1">{otpErrors.otp.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify OTP & Login/Sign Up'}
                </Button>
                <Button variant="link" onClick={() => { setPhoneStep('input'); resetRecaptcha(); }} className="w-full">
                  Back to phone number input
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="social">
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <Button onClick={() => handleSocialLogin('google')} className="w-full" variant="outline" disabled={isLoading}>
              <GoogleIcon /> <span className="ml-2">Sign in with Google</span>
            </Button>
            <Button onClick={() => handleSocialLogin('microsoft')} className="w-full" variant="outline" disabled={isLoading}>
              <MicrosoftIcon /> <span className="ml-2">Sign in with Microsoft</span>
            </Button>
            <Button onClick={() => handleSocialLogin('apple')} className="w-full" variant="outline" disabled={isLoading}>
              <AppleIcon /> <span className="ml-2">Sign in with Apple</span>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
