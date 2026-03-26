import { ArrowDown, ArrowUp, Globe, HardDrive } from 'lucide-react';

interface DeviceTraffic {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  download: number; // Мб/с
  upload: number; // Мб/с
  totalDownload: number; // ГБ за сегодня
  totalUpload: number; // ГБ за сегодня
  destinations: {
    name: string;
    ipAddress: string;
    traffic: number;
    type: 'local' | 'internet';
  }[];
}

interface TrafficDetailsProps {
  traffic: DeviceTraffic;
}

export function TrafficDetails({ traffic }: TrafficDetailsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Device Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {traffic.deviceName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {traffic.ipAddress}
          </p>
        </div>
      </div>

      {/* Current Speed */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Загрузка
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {traffic.download.toFixed(1)} <span className="text-sm">Мб/с</span>
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-900 dark:text-green-300">
              Отправка
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {traffic.upload.toFixed(1)} <span className="text-sm">Мб/с</span>
          </p>
        </div>
      </div>

      {/* Total Traffic Today */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Трафик за сегодня
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {traffic.totalDownload.toFixed(2)} ГБ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {traffic.totalUpload.toFixed(2)} ГБ
            </span>
          </div>
        </div>
      </div>

      {/* Destinations */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Направления трафика
        </h4>
        <div className="space-y-2">
          {traffic.destinations.map((dest, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {dest.type === 'internet' ? (
                    <Globe className="w-4 h-4 text-purple-500" />
                  ) : (
                    <HardDrive className="w-4 h-4 text-orange-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {dest.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {dest.traffic.toFixed(1)} Мб/с
                </span>
              </div>
              <div className="pl-6">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {dest.ipAddress}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}