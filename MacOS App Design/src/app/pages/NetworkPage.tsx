import { useOutletContext } from 'react-router';
import { NetworkChart } from '../components/NetworkChart';
import { NetworkError } from '../components/NetworkError';
import { TrafficDetails } from '../components/TrafficDetails';

// Моковые данные для трафика устройств
const devicesTraffic = [
  {
    deviceId: '1',
    deviceName: 'MacBook Pro 16"',
    ipAddress: '192.168.1.101',
    download: 12.4,
    upload: 5.2,
    totalDownload: 3.45,
    totalUpload: 1.23,
    destinations: [
      { name: 'YouTube', ipAddress: '142.250.185.78', traffic: 6.5, type: 'internet' as const },
      { name: 'iMac Office (SSH)', ipAddress: '192.168.1.102', traffic: 3.2, type: 'local' as const },
      { name: 'GitHub', ipAddress: '140.82.121.4', traffic: 2.7, type: 'internet' as const },
    ],
  },
  {
    deviceId: '2',
    deviceName: 'iMac 27"',
    ipAddress: '192.168.1.102',
    download: 8.7,
    upload: 3.4,
    totalDownload: 2.12,
    totalUpload: 0.89,
    destinations: [
      { name: 'Home Server (SMB)', ipAddress: '192.168.1.105', traffic: 5.1, type: 'local' as const },
      { name: 'Google Drive', ipAddress: '172.217.16.206', traffic: 2.3, type: 'internet' as const },
      { name: 'Slack', ipAddress: '54.230.159.122', traffic: 1.3, type: 'internet' as const },
    ],
  },
  {
    deviceId: '4',
    deviceName: 'MacBook Air',
    ipAddress: '88.201.45.123',
    download: 15.3,
    upload: 7.8,
    totalDownload: 5.67,
    totalUpload: 2.34,
    destinations: [
      { name: 'Netflix', ipAddress: '52.85.244.50', traffic: 9.2, type: 'internet' as const },
      { name: 'Spotify', ipAddress: '35.186.224.25', traffic: 3.4, type: 'internet' as const },
      { name: 'VPN (домашняя сеть)', ipAddress: '88.201.45.100', traffic: 2.7, type: 'internet' as const },
    ],
  },
  {
    deviceId: '5',
    deviceName: 'Home Server',
    ipAddress: '192.168.1.105',
    download: 2.1,
    upload: 18.5,
    totalDownload: 0.87,
    totalUpload: 12.34,
    destinations: [
      { name: 'MacBook Pro (SMB)', ipAddress: '192.168.1.101', traffic: 8.3, type: 'local' as const },
      { name: 'iMac (SMB)', ipAddress: '192.168.1.102', traffic: 6.2, type: 'local' as const },
      { name: 'Backup Cloud', ipAddress: '52.216.232.131', traffic: 4.0, type: 'internet' as const },
    ],
  },
];

export function NetworkPage() {
  // Подсчет общего трафика
  const totalDownload = devicesTraffic.reduce((sum, d) => sum + d.download, 0);
  const totalUpload = devicesTraffic.reduce((sum, d) => sum + d.upload, 0);

  const { localServer } = useOutletContext<{
    localServer: { name: string; ipAddress: string; status: 'online' | 'offline'; lastSeen?: string };
  }>();

  // Если локальный сервер оффлайн - показываем ошибку
  if (localServer.status === 'offline') {
    return <NetworkError serverName={localServer.name} serverIp={localServer.ipAddress} />;
  }

  return (
    <div className="px-6 py-8">
      {/* Title Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Сеть
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Общая скорость: ↓ {totalDownload.toFixed(1)} Мб/с • ↑ {totalUpload.toFixed(1)} Мб/с
        </p>
      </div>

      {/* Network Chart */}
      <div className="mb-8">
        <NetworkChart />
      </div>

      {/* Devices Traffic Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Трафик по устройствам
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devicesTraffic.map((traffic) => (
          <TrafficDetails key={traffic.deviceId} traffic={traffic} />
        ))}
      </div>
    </div>
  );
}