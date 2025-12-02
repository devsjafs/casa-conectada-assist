import { Thermometer, Droplets, Zap, Shield } from 'lucide-react';

const QuickStats = () => {
  const stats = [
    { icon: Thermometer, label: 'Temperatura Média', value: '24°C', color: 'text-orange-400' },
    { icon: Droplets, label: 'Umidade Média', value: '55%', color: 'text-blue-400' },
    { icon: Zap, label: 'Energia Hoje', value: '12.4 kWh', color: 'text-yellow-400' },
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
