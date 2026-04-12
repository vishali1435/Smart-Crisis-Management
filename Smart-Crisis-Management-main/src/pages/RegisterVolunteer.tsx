import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Mail, User, Phone, MapPin, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

const RegisterVolunteer = () => {
  const navigate = useNavigate();
  const { signUp, verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    skills: '',
  });
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setFormData(prev => ({ ...prev, address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }));
          toast({ title: 'Location Detected', description: 'Your GPS coordinates have been captured.' });
        },
        () => toast({ title: 'Location Error', description: 'Unable to get location.', variant: 'destructive' })
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error, needsVerification } = await signUp(formData.email, formData.password, {
      name: formData.name,
      role: 'volunteer',
      phone: formData.phone,
      latitude,
      longitude,
      address: formData.address,
    });

    if (error) {
      setError(error);
    } else if (needsVerification) {
      setShowOtpStep(true);
      toast({ title: 'OTP Sent', description: 'A verification code has been sent to your email.' });
    } else {
      toast({ title: 'Registration Submitted', description: 'Your registration is pending admin approval.' });
      navigate('/volunteer');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');
    const { error } = await verifyOtp(formData.email, otp);
    if (error) {
      setError(error);
      setOtp('');
    } else {
      toast({ title: 'Email Verified', description: 'Your registration is pending admin approval.' });
      navigate('/volunteer');
    }
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    const { error } = await resendOtp(formData.email);
    if (error) {
      setError(error);
    } else {
      toast({ title: 'OTP Resent', description: 'A new verification code has been sent to your email.' });
    }
    setIsResending(false);
  };

  if (showOtpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-success/5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-success rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-md glass-card animate-slide-up relative z-10">
          <CardHeader className="text-center">
            <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => setShowOtpStep(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex justify-center mb-4 pt-4">
              <div className="p-4 rounded-full bg-success/20">
                <KeyRound className="h-8 w-8 text-success" />
              </div>
            </div>
            <Logo size="sm" />
            <CardTitle className="text-xl mt-4">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{formData.email}</span>
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
            <Button variant="roleVolunteer" size="lg" className="w-full" onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6}>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-success/5">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-success rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-lg glass-card animate-slide-up relative z-10">
        <CardHeader className="text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4" onClick={() => navigate('/login/volunteer')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex justify-center mb-4 pt-4">
            <div className="p-4 rounded-full bg-success/20">
              <Users className="h-8 w-8 text-success" />
            </div>
          </div>
          <Logo size="sm" />
          <CardTitle className="text-xl mt-4">Register as Volunteer</CardTitle>
          <CardDescription>Join our crisis response team and help your community</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-10" required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Location</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="address" placeholder="Your address or area" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="pl-10" />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} title="Use GPS">
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {latitude && longitude && <p className="text-xs text-muted-foreground">GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills & Experience</Label>
              <Textarea id="skills" placeholder="First aid, driving, languages spoken, etc." value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} rows={3} />
            </div>
            
            <Button type="submit" variant="roleVolunteer" size="lg" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterVolunteer;
