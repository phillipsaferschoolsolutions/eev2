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
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  signInWithPopup,
} from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, KeyRound, Smartphone, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// Schemas
const emailPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});
type EmailPasswordFormData = z.infer<typeof emailPasswordSchema>;

const signupEmailPasswordSchema = emailPasswordSchema
  .extend({
    confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type SignupEmailPasswordFormData = z.infer<typeof signupEmailPasswordSchema>;


const phoneSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Invalid phone number' }),
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

const SocialLoginButtons = ({ isLoading, onSocialLogin }: { isLoading: boolean, onSocialLogin: (provider: 'google' | 'microsoft' | 'apple') => void }) => {
  return (
    <>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <Button onClick={() => onSocialLogin('google')} className="w-full" variant="outline" disabled={isLoading}>
          <GoogleIcon /> <span className="ml-2">Sign in with Google</span>
        </Button>
        <Button onClick={() => onSocialLogin('microsoft')} className="w-full" variant="outline" disabled={isLoading}>
          <MicrosoftIcon /> <span className="ml-2">Sign in with Microsoft</span>
        </Button>
        <Button onClick={() => onSocialLogin('apple')} className="w-full" variant="outline" disabled={isLoading}>
          <AppleIcon /> <span className="ml-2">Sign in with Apple</span>
        </Button>
      </div>
    </>
  );
};


export function AuthForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentTab, setCurrentTab] = useState("login");

  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const loginPasswordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signupPasswordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signupConfirmPasswordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loginForm = useForm<EmailPasswordFormData>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupEmailPasswordFormData>({
    resolver: zodResolver(signupEmailPasswordSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });


  useEffect(() => {
    if (!authLoading && user) {
      router.push('/'); 
    }
  }, [user, authLoading, router]);


  const resetRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
        const widgetId = (recaptchaVerifierRef.current as any).widgetId;
        if (typeof widgetId === 'number' && (window as any).grecaptcha && typeof (window as any).grecaptcha.reset === 'function') {
            try {
                (window as any).grecaptcha.reset(widgetId);
            } catch (e) {
                console.warn("Error resetting reCAPTCHA widget:", e);
            }
        }
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    if (currentTab === 'phone' && phoneStep === 'input' && recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
      if (typeof window !== 'undefined' && (window as any).grecaptcha && typeof (window as any).grecaptcha.render === 'function') {
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible',
            'callback': (response: unknown) => {
              // console.log("reCAPTCHA solved:", response);
            },
            'expired-callback': () => {
              toast({ variant: "destructive", title: "reCAPTCHA expired", description: "Please try sending the OTP again." });
              resetRecaptcha();
            }
          });
          recaptchaVerifierRef.current.render().catch((renderErr: unknown) => {
             console.error("Recaptcha render error inside useEffect:", renderErr);
} catch {
             resetRecaptcha(); 
          });
        } catch (initErr: unknown) {
          console.error("RecaptchaVerifier initialization error:", initErr);
          setError("Failed to initialize reCAPTCHA. Please refresh or try again later.");
          resetRecaptcha(); 
        }
      } else {
        // console.warn("reCAPTCHA script not loaded or container not ready for useEffect init.");
      }
    }
    // Cleanup function
    return () => {
      resetRecaptcha();
      if (loginPasswordTimerRef.current) clearTimeout(loginPasswordTimerRef.current);
      if (signupPasswordTimerRef.current) clearTimeout(signupPasswordTimerRef.current);
      if (signupConfirmPasswordTimerRef.current) clearTimeout(signupConfirmPasswordTimerRef.current);
    };
  }, [currentTab, phoneStep, toast]);


  const handleEmailPasswordSubmit = async (data: EmailPasswordFormData | SignupEmailPasswordFormData, isSignUp: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, data.email, (data as SignupEmailPasswordFormData).password);
        toast({ title: "Account Created!", description: "Welcome! You are now logged in." });
        signupForm.reset();
      } else {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({ title: "Logged In!", description: "Welcome back!" });
        loginForm.reset();
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      setError(firebaseError.message || 'An unknown error occurred.');
      toast({ variant: "destructive", title: "Authentication Failed", description: firebaseError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerName: 'google' | 'microsoft' | 'apple') => {
    setIsLoading(true);
    setError(null);
    let provider: GoogleAuthProvider | OAuthProvider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
    } else if (providerName === 'microsoft') {
      provider = new OAuthProvider('microsoft.com');
    } else if (providerName === 'apple') {
      provider = new OAuthProvider('apple.com');
    } else {
      setError('Invalid provider');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Logged In!',
        description: `Successfully signed in with ${providerName}.`,
      });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/account-exists-with-different-credential') {
        setError(
          'An account already exists with the same email address but different sign-in credentials. Try signing in using a method you&apos;ve used before.'
        );
        toast({
          variant: 'destructive',
          title: 'Account Conflict',
          description:
            'An account already exists with this email using a different sign-in method.',
        });
      } else {
        setError(firebaseError.message || `Failed to sign in with ${providerName}.`);
        toast({ variant: "destructive", title: "Sign-in Error", description: firebaseError.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!recaptchaVerifierRef.current) {
        if (recaptchaContainerRef.current && typeof window !== 'undefined' && (window as any).grecaptcha) {
           recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible', 'callback': () => {}, 'expired-callback': () => { resetRecaptcha(); }
          });
          await recaptchaVerifierRef.current.render();
        } else {
          throw new Error("reCAPTCHA verifier not initialized. Please ensure the reCAPTCHA container is visible.");
        }
      }
      const result = await signInWithPhoneNumber(auth, data.phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setPhoneStep('otp');
      phoneForm.reset();
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (err: unknown)
       {
      const firebaseError = err as { code?: string; message?: string };
      setError(firebaseError.message || 'Failed to send OTP.');
      toast({ variant: "destructive", title: "OTP Error", description: firebaseError.message });
      resetRecaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpFormData) => {
    setIsLoading(true);
    setError(null);
    if (!confirmationResult) {
      setError('No OTP confirmation result found. Please try sending an OTP again.');
      setIsLoading(false);
      return;
    }
    try {
      await confirmationResult.confirm(data.otp);
      toast({ title: "Logged In!", description: "Successfully verified phone number." });
      setPhoneStep('input');
      otpForm.reset();
      resetRecaptcha();
    } catch (err: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      setError(firebaseError.message || 'Failed to verify OTP.');
      toast({ variant: "destructive", title: "OTP Verification Failed", description: firebaseError.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    setError(null);
    loginForm.reset();
    signupForm.reset();
    phoneForm.reset();
    otpForm.reset();
    setPhoneStep('input');

    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowConfirmPassword(false);

    if (loginPasswordTimerRef.current) {
      clearTimeout(loginPasswordTimerRef.current);
      loginPasswordTimerRef.current = null;
    }
    if (signupPasswordTimerRef.current) {
      clearTimeout(signupPasswordTimerRef.current);
      signupPasswordTimerRef.current = null;
    }
    if (signupConfirmPasswordTimerRef.current) {
      clearTimeout(signupConfirmPasswordTimerRef.current);
      signupConfirmPasswordTimerRef.current = null;
    }

    resetRecaptcha();
  };

  const togglePasswordVisibility = (
    field: 'login' | 'signup' | 'confirm',
    currentVisibility: boolean,
    setVisibility: React.Dispatch<React.SetStateAction<boolean>>,
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>
  ) => {
    if (currentVisibility) {
      setVisibility(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    } else {
      setVisibility(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setVisibility(false);
        timerRef.current = null;
      }, 15000);
    }
  };


  if (authLoading && !user) {
    return <p className="text-center text-muted-foreground py-8">Loading authentication status...</p>;
  }

  return (
    <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange} value={currentTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
        <TabsTrigger value="phone">Phone</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TabsContent value="login">
        <Card className="border-0 shadow-none bg-card">
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={loginForm.handleSubmit(data => handleEmailPasswordSubmit(data, false))} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-email" type="email" placeholder="you@example.com" {...loginForm.register('email')} className="pl-10" />
                </div>
                {loginForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" {...loginForm.register('password')} className="pl-10 pr-10" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => togglePasswordVisibility('login', showLoginPassword, setShowLoginPassword, loginPasswordTimerRef)}>
                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showLoginPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
                {loginForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            <SocialLoginButtons isLoading={isLoading} onSocialLogin={handleSocialLogin} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="signup">
        <Card className="border-0 shadow-none bg-card">
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={signupForm.handleSubmit(data => handleEmailPasswordSubmit(data, true))} className="space-y-4">
               <div>
                <Label htmlFor="signup-email">Email</Label>
                 <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="signup-email" type="email" placeholder="you@example.com" {...signupForm.register('email')} className="pl-10" />
                </div>
                {signupForm.formState.errors.email && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="signup-password" type={showSignupPassword ? "text" : "password"} placeholder="Create a password" {...signupForm.register('password')} className="pl-10 pr-10" />
                   <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                           onClick={() => togglePasswordVisibility('signup', showSignupPassword, setShowSignupPassword, signupPasswordTimerRef)}>
                    {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showSignupPassword ? "Hide password" : "Show password"}</span>
                  </Button>
                </div>
                {signupForm.formState.errors.password && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="signup-confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" {...signupForm.register('confirmPassword')} className="pl-10 pr-10" />
                   <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                           onClick={() => togglePasswordVisibility('confirm', showConfirmPassword, setShowConfirmPassword, signupConfirmPasswordTimerRef)}>
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    <span className="sr-only">{showConfirmPassword ? "Hide confirm password" : "Show confirm password"}</span>
                  </Button>
                </div>
                {signupForm.formState.errors.confirmPassword && <p className="text-sm text-destructive mt-1">{signupForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                {isLoading ? 'Signing up...' : 'Sign Up with Email'}
              </Button>
            </form>
            <SocialLoginButtons isLoading={isLoading} onSocialLogin={handleSocialLogin} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="phone">
        <Card className="border-0 shadow-none bg-card">
          <CardContent className="space-y-6 pt-6">
            {phoneStep === 'input' && (
              <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="phone-number" type="tel" placeholder="+1 123 456 7890" {...phoneForm.register('phoneNumber')} className="pl-10" />
                  </div>
                  {phoneForm.formState.errors.phoneNumber && <p className="text-sm text-destructive mt-1">{phoneForm.formState.errors.phoneNumber.message}</p>}
                </div>
                <div ref={recaptchaContainerRef} id="recaptcha-container" className="my-4 flex justify-center"></div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            )}
            {phoneStep === 'otp' && (
              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code (OTP)</Label>
                   <div className="relative">
                     <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="otp" type="text" placeholder="Enter 6-digit OTP" {...otpForm.register('otp')} className="pl-10" />
                  </div>
                  {otpForm.formState.errors.otp && <p className="text-sm text-destructive mt-1">{otpForm.formState.errors.otp.message}</p>}
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
    </Tabs>
  );
}