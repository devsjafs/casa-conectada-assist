import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Lightbulb, Gamepad2, Plus, Plug, Home as HomeIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/dashboard/Header';
import CameraCard from '@/components/dashboard/CameraCard';
import LightCard from '@/components/dashboard/LightCard';
import RemoteCard from '@/components/dashboard/RemoteCard';
import RoomSelector from '@/components/dashboard/RoomSelector';
import QuickStats from '@/components/dashboard/QuickStats';
import IntegrationsPage from '@/components/dashboard/IntegrationsPage';
import AddDeviceDialog from '@/components/dashboard/AddDeviceDialog';
import AddRoomDialog from '@/components/dashboard/AddRoomDialog';
import { Button } from '@/components/ui/button';

interface Room {
  id: string;
  name: string;
  icon: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  is_on: boolean;
  settings: any;
  room_id: string | null;
  integration_id: string | null;
  rooms?: { name: string } | null;
  integrations?: { type: string; name: string } | null;
}

interface CameraData {
  id: string;
  device_id: string;
  stream_url: string | null;
  snapshot_url: string | null;
  status: string;
  devices: {
    id: string;
    name: string;
    room_id: string | null;
    rooms: { name: string } | null;
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    const [roomsRes, devicesRes, camerasRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('user_id', user?.id),
      supabase.from('devices').select('*, rooms(name), integrations(type, name)').eq('user_id', user?.id),
      supabase.from('cameras').select('*, devices!inner(id, name, room_id, user_id, rooms(name))').eq('devices.user_id', user?.id),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (devicesRes.data) setDevices(devicesRes.data as any);
    if (camerasRes.data) setCameras(camerasRes.data as any);
    
    setLoading(false);
  };

  const handleDeviceToggle = async (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newState = !device.is_on;
    
    // Optimistic update
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, is_on: newState } : d
    ));

    await supabase
      .from('devices')
      .update({ is_on: newState })
      .eq('id', id);
  };

  const handleBrightnessChange = async (id: string, brightness: number) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, settings: { ...d.settings, brightness } } : d
    ));

    await supabase
      .from('devices')
      .update({ settings: { ...device.settings, brightness } })
      .eq('id', id);
  };

  const handleDeviceSettingChange = async (id: string, setting: string, value: number | string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newSettings = { ...device.settings, [setting]: value };
    
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, settings: newSettings } : d
    ));

    await supabase
      .from('devices')
      .update({ settings: newSettings })
      .eq('id', id);
  };

  // Filter devices
  const lights = devices.filter(d => d.type === 'light');
  const remoteDevices = devices.filter(d => ['ac', 'tv', 'soundbar', 'fan'].includes(d.type));

  const filteredLights = selectedRoom 
    ? lights.filter(l => l.room_id === selectedRoom)
    : lights;

  const filteredDevices = selectedRoom
    ? remoteDevices.filter(d => d.room_id === selectedRoom)
    : remoteDevices;

  const filteredCameras = selectedRoom
    ? cameras.filter(c => c.devices.room_id === selectedRoom)
    : cameras;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (showIntegrations) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <Header />
          <main className="container mx-auto px-4 py-6">
            <IntegrationsPage onBack={() => setShowIntegrations(false)} />
          </main>
        </div>
      </div>
    );
  }

  const hasNoData = rooms.length === 0 && devices.length === 0 && cameras.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header onOpenIntegrations={() => setShowIntegrations(true)} />

        <main className="container mx-auto px-4 py-6 space-y-8">
          {hasNoData ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-6 rounded-2xl bg-primary/10 mb-6">
                <HomeIcon className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Smart Home!</h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                Comece configurando suas integrações e adicionando seus dispositivos para controlar sua casa.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => setShowIntegrations(true)} variant="outline" size="lg">
                  <Plug className="w-5 h-5 mr-2" />
                  Configurar Integrações
                </Button>
                <Button onClick={() => setShowAddRoom(true)} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Adicionar Cômodo
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <QuickStats devicesCount={devices.length} onlineCount={devices.filter(d => d.is_on).length} />

              {/* Room Selector */}
              <section className="flex items-center justify-between">
                <RoomSelector 
                  rooms={rooms} 
                  selectedRoom={selectedRoom} 
                  onSelectRoom={setSelectedRoom} 
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddRoom(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Cômodo
                  </Button>
                  <Button size="sm" onClick={() => setShowAddDevice(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Dispositivo
                  </Button>
                </div>
              </section>

              {/* Cameras Section */}
              {filteredCameras.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Câmeras</h2>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {filteredCameras.filter(c => c.status === 'online').length} online
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredCameras.map(camera => (
                      <CameraCard 
                        key={camera.id} 
                        camera={{
                          id: camera.id,
                          name: camera.devices.name,
                          location: camera.devices.rooms?.name || 'Sem local',
                          status: camera.status as 'online' | 'offline',
                          thumbnail: camera.snapshot_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
                        }} 
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Lights Section */}
              {filteredLights.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Iluminação</h2>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {filteredLights.filter(l => l.is_on).length} ligadas
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredLights.map(light => (
                      <LightCard 
                        key={light.id} 
                        light={{
                          id: light.id,
                          name: light.name,
                          room: light.rooms?.name || 'Sem local',
                          isOn: light.is_on,
                          brightness: light.settings?.brightness || 100,
                          color: light.settings?.color,
                          brand: (light.integrations?.type as any) || 'tuya',
                        }} 
                        onToggle={handleDeviceToggle}
                        onBrightnessChange={handleBrightnessChange}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Remote Devices Section */}
              {filteredDevices.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Controles Remotos</h2>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {filteredDevices.filter(d => d.is_on).length} ativos
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDevices.map(device => (
                      <RemoteCard 
                        key={device.id} 
                        device={{
                          id: device.id,
                          name: device.name,
                          type: device.type as any,
                          room: device.rooms?.name || 'Sem local',
                          isOn: device.is_on,
                          brand: (device.integrations?.type as any) || 'positivo',
                          settings: device.settings,
                        }} 
                        onToggle={handleDeviceToggle}
                        onSettingChange={handleDeviceSettingChange}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty sections prompt */}
              {devices.length === 0 && (
                <div className="text-center py-12 glass rounded-xl">
                  <p className="text-muted-foreground mb-4">Nenhum dispositivo cadastrado ainda</p>
                  <Button onClick={() => setShowAddDevice(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Dispositivo
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AddDeviceDialog 
        open={showAddDevice} 
        onOpenChange={setShowAddDevice} 
        onDeviceAdded={fetchData}
      />
      <AddRoomDialog 
        open={showAddRoom} 
        onOpenChange={setShowAddRoom} 
        onRoomAdded={fetchData}
      />
    </div>
  );
};

export default Index;
