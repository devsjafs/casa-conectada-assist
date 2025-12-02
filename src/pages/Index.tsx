import { useState } from 'react';
import { Camera, Lightbulb, Gamepad2, ChevronRight } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import CameraCard from '@/components/dashboard/CameraCard';
import LightCard from '@/components/dashboard/LightCard';
import RemoteCard from '@/components/dashboard/RemoteCard';
import RoomSelector from '@/components/dashboard/RoomSelector';
import QuickStats from '@/components/dashboard/QuickStats';
import { cameras, lights as initialLights, remoteDevices as initialDevices, rooms } from '@/data/mockData';
import type { Light, RemoteDevice } from '@/data/mockData';

const Index = () => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [lights, setLights] = useState<Light[]>(initialLights);
  const [devices, setDevices] = useState<RemoteDevice[]>(initialDevices);

  const filteredLights = selectedRoom 
    ? lights.filter(l => rooms.find(r => r.id === selectedRoom)?.name === l.room)
    : lights;

  const filteredDevices = selectedRoom
    ? devices.filter(d => rooms.find(r => r.id === selectedRoom)?.name === d.room)
    : devices;

  const handleLightToggle = (id: string) => {
    setLights(prev => prev.map(l => 
      l.id === id ? { ...l, isOn: !l.isOn } : l
    ));
  };

  const handleBrightnessChange = (id: string, brightness: number) => {
    setLights(prev => prev.map(l => 
      l.id === id ? { ...l, brightness } : l
    ));
  };

  const handleDeviceToggle = (id: string) => {
    setDevices(prev => prev.map(d => 
      d.id === id ? { ...d, isOn: !d.isOn } : d
    ));
  };

  const handleDeviceSettingChange = (id: string, setting: string, value: number) => {
    setDevices(prev => prev.map(d => 
      d.id === id 
        ? { ...d, settings: { ...d.settings, [setting]: value } } 
        : d
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 py-6 space-y-8">
          {/* Quick Stats */}
          <QuickStats />

          {/* Room Selector */}
          <section>
            <RoomSelector 
              rooms={rooms} 
              selectedRoom={selectedRoom} 
              onSelectRoom={setSelectedRoom} 
            />
          </section>

          {/* Cameras Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Câmeras</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {cameras.filter(c => c.status === 'online').length} online
                </span>
              </div>
              <button className="flex items-center gap-1 text-sm text-primary hover:underline">
                Ver todas <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {cameras.map(camera => (
                <CameraCard key={camera.id} camera={camera} />
              ))}
            </div>
          </section>

          {/* Lights Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Iluminação</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {filteredLights.filter(l => l.isOn).length} ligadas
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLights.map(light => (
                <LightCard 
                  key={light.id} 
                  light={light} 
                  onToggle={handleLightToggle}
                  onBrightnessChange={handleBrightnessChange}
                />
              ))}
            </div>
          </section>

          {/* Remote Devices Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Controles Remotos</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {filteredDevices.filter(d => d.isOn).length} ativos
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDevices.map(device => (
                <RemoteCard 
                  key={device.id} 
                  device={device} 
                  onToggle={handleDeviceToggle}
                  onSettingChange={handleDeviceSettingChange}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;
