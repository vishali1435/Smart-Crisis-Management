import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, MapPin, AlertTriangle, Send, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const incidentCategories = [
  { id: 'accident', label: 'Accident', icon: '🚗' },
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'medical', label: 'Medical Emergency', icon: '🏥' },
  { id: 'theft', label: 'Theft', icon: '🔒' },
  { id: 'flood', label: 'Flood', icon: '🌊' },
  { id: 'power', label: 'Power Outage', icon: '⚡' },
  { id: 'other', label: 'Other', icon: '📋' },
];

const severityOptions = ['low', 'medium', 'high', 'critical'];

const ReportIncident = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !location || !title) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;

    // Upload image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('incident-images').upload(fileName, imageFile);
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('incident-images').getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('incidents').insert({
      reporter_id: user?.id,
      title,
      description,
      type: selectedCategory,
      category: selectedCategory,
      location,
      latitude,
      longitude,
      severity,
      status: 'reported',
      image_url: imageUrl,
    } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Incident Reported', description: 'Your report has been submitted. Help is on the way.' });
      navigate('/citizen');
    }
    setIsSubmitting(false);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lon);
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          toast({ title: 'Location Detected', description: 'Your GPS coordinates have been added.' });
        },
        () => {
          toast({ title: 'Location Error', description: 'Unable to get your location.', variant: 'destructive' });
        }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/citizen')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Report an Incident</h1>
            <p className="text-muted-foreground">Help us respond quickly to emergencies</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Incident Category *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {incidentCategories.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)}
                    className={`group relative p-6 rounded-2xl border-2 text-center transition-all duration-200 shadow-sm hover:shadow-md ${selectedCategory === cat.id ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-primary/10' : 'border-border/60 bg-card hover:bg-accent/50 hover:border-primary/30'}`}>
                    <span className="text-4xl mb-3 block drop-shadow-sm">{cat.icon}</span>
                    <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Title */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Incident Title *</CardTitle></CardHeader>
            <CardContent>
              <Input placeholder="Brief title for the incident" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Location *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Enter address or location description" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" onClick={handleGetLocation}>
                  <MapPin className="h-4 w-4 mr-2" /> GPS
                </Button>
              </div>
              {latitude && longitude && (
                <p className="text-xs text-muted-foreground">Coordinates: {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
              )}
            </CardContent>
          </Card>

          {/* Severity */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Severity</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {severityOptions.map((s) => (
                  <Button key={s} type="button" variant={severity === s ? 'default' : 'outline'} size="sm" onClick={() => setSeverity(s)} className="capitalize flex-1">
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
            <CardContent>
              <Textarea placeholder="Describe the situation in detail..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Upload Evidence (Optional)</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full object-contain rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                  </div>
                )}
              </Label>
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </CardContent>
          </Card>

          <Button type="submit" variant="warning" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>) : (<><Send className="h-4 w-4 mr-2" /> Submit Report</>)}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ReportIncident;
