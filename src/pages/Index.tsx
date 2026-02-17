import { useState, useEffect } from 'react';
import { Plus, Plug, Home as HomeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/dashboard/Header';
import CameraCard from '@/components/dashboard/CameraCard';
import LightCard from '@/components/dashboard/LightCard';
import RemoteCard from '@/components/dashboard/RemoteCard';
import RoomSelector from '@/components/dashboard/RoomSelector';
import IntegrationsPage from '@/components/dashboard/IntegrationsPage';
import AddDeviceDialog from '@/components/dashboard/AddDeviceDialog';
import AddRoomDialog from '@/components/dashboard/AddRoomDialog';
import NotificationsPanel from '@/components/dashboard/NotificationsPanel';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

interface HouseholdMember {
  id: string;
  name: string;
  avatar_url: string | null;
  face_embedding: any;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [recognizedMemberId, setRecognizedMemberId] = useState<string | null>(null);

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
    
    const [roomsRes, devicesRes, camerasRes, membersRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('user_id', user?.id),
      supabase.from('devices').select('*, rooms(name), integrations(type, name)').eq('user_id', user?.id),
      supabase.from('cameras').select('*, devices!inner(id, name, room_id, user_id, rooms(name))').eq('devices.user_id', user?.id),
      supabase.from('household_members').select('*').eq('user_id', user?.id),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (devicesRes.data) setDevices(devicesRes.data as any);
    if (camerasRes.data) setCameras(camerasRes.data as any);
    if (membersRes.data) setMembers(membersRes.data);
    
    setLoading(false);
  };

  const handleDeviceToggle = async (id: string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newState = !device.is_on;
    
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, is_on: newState } : d
    ));

    if (device.integrations?.type === 'smartthings') {
      try {
        const { error } = await supabase.functions.invoke('smartthings-control', {
          body: {
            deviceId: id,
            userId: user?.id,
            command: { type: 'switch', value: newState }
          }
        });
        
        if (error) {
          console.error('SmartThings control error:', error);
          setDevices(prev => prev.map(d => 
            d.id === id ? { ...d, is_on: !newState } : d
          ));
        }
      } catch (err) {
        console.error('Error calling SmartThings:', err);
        setDevices(prev => prev.map(d => 
          d.id === id ? { ...d, is_on: !newState } : d
        ));
      }
    } else {
      await supabase
        .from('devices')
        .update({ is_on: newState })
        .eq('id', id);
    }
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

  const handleDeleteDevice = async (deviceId: string) => {
    // Delete camera entry first (if exists), then device
    await supabase.from('cameras').delete().eq('device_id', deviceId);
    await supabase.from('devices').delete().eq('id', deviceId);
    
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    setCameras(prev => prev.filter(c => c.device_id !== deviceId));
    
    toast({
      title: 'Dispositivo excluído',
      description: 'O dispositivo foi removido com sucesso.',
    });
  };

  const handleDeleteCamera = async (cameraId: string) => {
    const camera = cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    await supabase.from('cameras').delete().eq('id', cameraId);
    await supabase.from('devices').delete().eq('id', camera.device_id);
    
    setCameras(prev => prev.filter(c => c.id !== cameraId));
    setDevices(prev => prev.filter(d => d.id !== camera.device_id));
    
    toast({
      title: 'Câmera excluída',
      description: 'A câmera foi removida com sucesso.',
    });
  };

  const handleDeviceSettingChange = async (id: string, setting: string, value: number | string) => {
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const newSettings = { ...device.settings, [setting]: value };
    
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, settings: newSettings } : d
    ));

    if (device.integrations?.type === 'smartthings') {
      let commandType = '';
      if (setting === 'temperature') commandType = 'setTemperature';
      else if (setting === 'mode') commandType = 'setMode';
      else if (setting === 'fanSpeed') commandType = 'setFanSpeed';

      if (commandType) {
        try {
          const { error } = await supabase.functions.invoke('smartthings-control', {
            body: {
              deviceId: id,
              userId: user?.id,
              command: { type: commandType, value }
            }
          });
          
          if (error) {
            console.error('SmartThings setting error:', error);
          }
        } catch (err) {
          console.error('Error calling SmartThings:', err);
        }
      }
    } else {
      await supabase
        .from('devices')
        .update({ settings: newSettings })
        .eq('id', id);
    }
  };

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

  // Unified widget list for the grid
  const allWidgets = [
    ...filteredCameras.map(c => ({ type: 'camera' as const, data: c })),
    ...filteredLights.map(l => ({ type: 'light' as const, data: l })),
    ...filteredDevices.map(d => ({ type: 'remote' as const, data: d })),
  ];

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
        <div className="relative z-10">
          <Header onMembersUpdated={fetchData} />
          <main className="container mx-auto px-4 py-6">
            <IntegrationsPage onBack={() => setShowIntegrations(false)} />
          </main>
        </div>
      </div>
    );
  }

  const hasNoData = rooms.length === 0 && devices.length === 0 && cameras.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ambient Header */}
      <Header 
        onOpenIntegrations={() => setShowIntegrations(true)} 
        onMembersUpdated={fetchData}
        devicesCount={devices.length}
        onlineCount={devices.filter(d => d.is_on).length}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Devices area - LEFT */}
        <div className="flex-1 flex flex-col px-4 md:px-6 pb-4 overflow-y-auto">
          {hasNoData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
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
              {/* Unified widgets grid */}
              <div className="flex-1">
                {allWidgets.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {allWidgets.map((widget) => {
                      if (widget.type === 'camera') {
                        const c = widget.data as CameraData;
                        return (
                          <CameraCard 
                            key={`cam-${c.id}`}
                            camera={{
                              id: c.id,
                              name: c.devices.name,
                              location: c.devices.rooms?.name || 'Sem local',
                              status: c.status as 'online' | 'offline',
                              thumbnail: c.snapshot_url || null,
                            }}
                            onDelete={handleDeleteCamera}
                          />
                        );
                      }
                      if (widget.type === 'light') {
                        const l = widget.data as Device;
                        return (
                          <LightCard 
                            key={`light-${l.id}`}
                            light={{
                              id: l.id,
                              name: l.name,
                              room: l.rooms?.name || 'Sem local',
                              isOn: l.is_on,
                              brightness: l.settings?.brightness || 100,
                              color: l.settings?.color,
                              brand: (l.integrations?.type as any) || 'tuya',
                            }}
                            onToggle={handleDeviceToggle}
                            onBrightnessChange={handleBrightnessChange}
                            onDelete={handleDeleteDevice}
                          />
                        );
                      }
                      const d = widget.data as Device;
                      return (
                        <RemoteCard 
                          key={`remote-${d.id}`}
                          device={{
                            id: d.id,
                            name: d.name,
                            type: d.type as any,
                            room: d.rooms?.name || 'Sem local',
                            isOn: d.is_on,
                            brand: (d.integrations?.type as any) || 'positivo',
                            settings: d.settings,
                          }}
                          onToggle={handleDeviceToggle}
                          onSettingChange={handleDeviceSettingChange}
                          onDelete={handleDeleteDevice}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 glass rounded-xl">
                    <p className="text-muted-foreground mb-4">Nenhum dispositivo cadastrado ainda</p>
                    <Button onClick={() => setShowAddDevice(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Dispositivo
                    </Button>
                  </div>
                )}
              </div>

              {/* Room selector pills + add buttons at bottom */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
                <RoomSelector 
                  rooms={rooms} 
                  selectedRoom={selectedRoom} 
                  onSelectRoom={setSelectedRoom} 
                />
                <div className="flex gap-1.5 shrink-0 ml-3">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAddRoom(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Cômodo
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAddDevice(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Dispositivo
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications sidebar - RIGHT SIDE, visible on tablets landscape and up */}
        <div className="hidden md:block w-72 lg:w-80 xl:w-96 h-full py-2 pr-4 shrink-0">
          <div className="h-full">
            <NotificationsPanel 
              members={members}
              recognizedMemberId={recognizedMemberId} 
              onMemberRecognized={setRecognizedMemberId}
            />
          </div>
        </div>
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
