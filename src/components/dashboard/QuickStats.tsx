import { Cpu, Power, Zap, Shield } from 'lucide-react';

interface QuickStatsProps {
  devicesCount: number;
  onlineCount: number;
}

const QuickStats = ({ devicesCount, onlineCount }: QuickStatsProps) => {
  const stats = [
    { icon: Cpu, label: 'Dispositivos', value: devicesCount.toString(), color: 'text-primary' },
    { icon: Power, label: 'Ativos', value: onlineCount.toString(), color: 'text-success' },
    { icon: Zap, label: 'Consumo', value: '-- kWh', color: 'text-yellow-400' },
    { icon: Shield, label: 'Segurança', value: 'Ativa', color: 'text-success' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;
