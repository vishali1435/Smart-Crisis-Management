import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Eye, EyeOff, Mail, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

const LoginCitizen = () => {
  const navigate = useNavigate();
  const { signIn, signUp, verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isSignUp) {
      const { error, needsVerification } = await signUp(email, password, { name, role: 'citizen' });
      if (error) {
        setError(error);
      } else if (needsVerification) {
        setShowOtpStep(true);
        toast({ title: 'OTP Sent', description: 'A verification code has been sent to your email.' });
      } else {
        toast({ title: 'Welcome', description: 'Account created successfully.' });
        navigate('/citizen');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        toast({ title: 'Welcome', description: 'You have successfully logged in.' });
        navigate('/citizen');
      }
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');
    const { error } = await verifyOtp(email, otp);
    if (error) {
      setError(error);
      setOtp('');
    } else {
      toast({ title: 'Email Verified', description: 'Your account has been verified successfully.' });
      navigate('/citizen');
    }
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    const { error } = await resendOtp(email);
    if (error) {
      setError(error);
    } else {
      toast({ title: 'OTP Resent', description: 'A new verification code has been sent to your email.' });
    }
    setIsResending(false);
  };

  if (showOtpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-warning/5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-warning rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-md glass-card animate-slide-up relative z-10">
          <CardHeader className="text-center">
            <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => setShowOtpStep(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex justify-center mb-4 pt-4">
              <div className="p-4 rounded-full bg-warning/20">
                <KeyRound className="h-8 w-8 text-warning" />
              </div>
            </div>
            <Logo size="sm" />
            <CardTitle className="text-xl mt-4">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button variant="roleCitizen" size="lg" className="w-full" onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
              <Button variant="ghost" size="sm" onClick={handleResendOtp} disabled={isResending}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Resending...' : 'Resend OTP'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-warning/5">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-warning rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass-card animate-slide-up relative z-10">
        <CardHeader className="text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex justify-center mb-4 pt-4">
            <div className="p-4 rounded-full bg-warning/20">
              <User className="h-8 w-8 text-warning" />
            </div>
          </div>
          <Logo size="sm" />
          <CardTitle className="text-xl mt-4">{isSignUp ? 'Create Citizen Account' : 'Citizen Login'}</CardTitle>
          <CardDescription>{isSignUp ? 'Sign up to report incidents and get alerts' : 'Sign in to access your dashboard'}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="citizen@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            
            <Button type="submit" variant="roleCitizen" size="lg" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? (isSignUp ? 'Creating...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>

            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginCitizen;
