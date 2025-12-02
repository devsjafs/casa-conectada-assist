export interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  thumbnail: string;
}

export interface Light {
  id: string;
  name: string;
  room: string;
  isOn: boolean;
  brightness: number;
  color?: string;
  brand: 'tuya' | 'positivo' | 'smartthings';
}

export interface RemoteDevice {
  id: string;
  name: string;
  type: 'tv' | 'ac' | 'soundbar' | 'fan';
  room: string;
  isOn: boolean;
  brand: 'positivo' | 'smartthings';
  settings?: {
    temperature?: number;
    volume?: number;
    mode?: string;
  };
}

export interface Room {
  id: string;
  name: string;
  icon: string;
  temperature?: number;
  humidity?: number;
}

export const cameras: Camera[] = [
  { id: '1', name: 'Entrada Principal', location: 'Frente', status: 'online', thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
  { id: '2', name: 'Garagem', location: 'Lateral', status: 'online', thumbnail: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=400&h=300&fit=crop' },
  { id: '3', name: 'Quintal', location: 'Fundos', status: 'online', thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop' },
  { id: '4', name: 'Sala de Estar', location: 'Interno', status: 'offline', thumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop' },
];

export const lights: Light[] = [
  { id: '1', name: 'Luz Principal', room: 'Sala', isOn: true, brightness: 80, color: '#FFE4B5', brand: 'tuya' },
  { id: '2', name: 'Luz de Leitura', room: 'Sala', isOn: false, brightness: 50, brand: 'positivo' },
  { id: '3', name: 'Luz do Teto', room: 'Quarto', isOn: true, brightness: 60, color: '#E6E6FA', brand: 'tuya' },
  { id: '4', name: 'Abajur', room: 'Quarto', isOn: false, brightness: 30, brand: 'smartthings' },
  { id: '5', name: 'Luz da Cozinha', room: 'Cozinha', isOn: true, brightness: 100, brand: 'positivo' },
  { id: '6', name: 'Luz do Banheiro', room: 'Banheiro', isOn: false, brightness: 70, brand: 'tuya' },
];

export const remoteDevices: RemoteDevice[] = [
  { id: '1', name: 'TV Samsung', type: 'tv', room: 'Sala', isOn: true, brand: 'smartthings', settings: { volume: 25 } },
  { id: '2', name: 'Ar Condicionado', type: 'ac', room: 'Sala', isOn: true, brand: 'positivo', settings: { temperature: 23, mode: 'cool' } },
  { id: '3', name: 'Soundbar', type: 'soundbar', room: 'Sala', isOn: false, brand: 'smartthings', settings: { volume: 40 } },
  { id: '4', name: 'Ar Condicionado', type: 'ac', room: 'Quarto', isOn: false, brand: 'positivo', settings: { temperature: 22, mode: 'cool' } },
  { id: '5', name: 'Ventilador', type: 'fan', room: 'Quarto', isOn: true, brand: 'positivo' },
  { id: '6', name: 'TV LG', type: 'tv', room: 'Quarto', isOn: false, brand: 'positivo', settings: { volume: 15 } },
];

export const rooms: Room[] = [
  { id: '1', name: 'Sala', icon: 'sofa', temperature: 24, humidity: 55 },
  { id: '2', name: 'Quarto', icon: 'bed', temperature: 22, humidity: 50 },
  { id: '3', name: 'Cozinha', icon: 'cooking-pot', temperature: 26, humidity: 60 },
  { id: '4', name: 'Banheiro', icon: 'bath', temperature: 25, humidity: 70 },
  { id: '5', name: 'Escritório', icon: 'monitor', temperature: 23, humidity: 45 },
];
