import { Monitor, Wifi, WifiOff } from 'lucide-react';

export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  computerName: string;
  status: 'online' | 'offline';
  type: 'local' | 'internet';
}

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const isOnline = device.status === 'online';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-gray-900/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Monitor className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              isOnline
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {isOnline ? 'В сети' : 'Не в сети'}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
        {device.name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        {device.ipAddress}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        {device.computerName}
      </p>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {device.type === 'local' ? 'Локальная сеть' : 'Интернет'}
        </span>
      </div>
    </div>
  );
}
