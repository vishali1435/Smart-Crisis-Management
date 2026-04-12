import { useEffect, useState } from 'react';
import { Shield, MapPin, List, Map } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const shelterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CitizenShelters = () => {
  const [shelters, setShelters] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => console.log('Location access denied')
    );
  }, []);

  useEffect(() => {
    const fetchShelters = async () => {
      const { data } = await supabase.from('resources').select('*').eq('category', 'shelter').eq('status', 'available').order('name');
      setShelters((data as any[]) || []);
    };
    fetchShelters();
  }, []);

  const sheltersWithCoords = shelters.filter(s => s.latitude && s.longitude);
  const center: [number, number] = sheltersWithCoords.length > 0
    ? [sheltersWithCoords[0].latitude, sheltersWithCoords[0].longitude]
    : [28.6139, 77.2090];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Find Shelters</h1>
            <p className="text-muted-foreground">Nearby shelters and safe zones</p>
          </div>
          <div className="flex gap-2">
            <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
              <List className="h-4 w-4 mr-1" /> List
            </Button>
            <Button variant={view === 'map' ? 'default' : 'outline'} size="sm" onClick={() => setView('map')}>
              <Map className="h-4 w-4 mr-1" /> Map
            </Button>
          </div>
        </div>

        {shelters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No shelters available at the moment.</p>
            </CardContent>
          </Card>
        ) : view === 'map' ? (
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <div style={{ height: '450px', width: '100%' }}>
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                      <Popup><p className="font-bold text-sm">📍 Your Location</p></Popup>
                    </Marker>
                  )}
                  {sheltersWithCoords.map((shelter) => (
                    <Marker key={shelter.id} position={[shelter.latitude, shelter.longitude]} icon={shelterIcon}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">{shelter.name}</p>
                          <p>{shelter.location}</p>
                          <p>Capacity: {shelter.quantity}</p>
                          <a
                            href={`https://www.google.com/maps/dir/${userLocation ? userLocation.join(',') : ''}/${shelter.latitude},${shelter.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline mt-1 inline-block"
                          >
                            Get Directions →
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelters.map((shelter: any) => (
              <Card key={shelter.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Shield className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">{shelter.name}</p>
                      {shelter.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {shelter.location}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">Capacity: {shelter.quantity}</p>
                      {shelter.latitude && shelter.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/${userLocation ? userLocation.join(',') : ''}/${shelter.latitude},${shelter.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="mt-2">
                            <MapPin className="h-3 w-3 mr-1" /> Get Directions
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CitizenShelters;
