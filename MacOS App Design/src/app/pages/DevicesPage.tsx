import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { ConnectionModal } from '../components/ConnectionModal';
import { Device, DeviceCard } from '../components/DeviceCard';
import { NetworkError } from '../components/NetworkError';

// Моковые данные для демонстрации
const initialDevices: Device[] = [
  {
    id: '1',
    name: 'MacBook Pro 16"',
    ipAddress: '192.168.1.101',
    computerName: 'MacBook-Pro-Admin',
    status: 'online',
    type: 'local',
  },
  {
    id: '2',
    name: 'iMac 27"',
    ipAddress: '192.168.1.102',
    computerName: 'iMac-Office',
    status: 'online',
    type: 'local',
  },
  {
    id: '3',
    name: 'Windows Desktop',
    ipAddress: '192.168.1.103',
    computerName: 'DESKTOP-PC',
    status: 'offline',
    type: 'local',
  },
  {
    id: '4',
    name: 'MacBook Air',
    ipAddress: '88.201.45.123',
    computerName: 'MacBook-Air-Remote',
    status: 'online',
    type: 'internet',
  },
  {
    id: '5',
    name: 'Home Server',
    ipAddress: '192.168.1.105',
    computerName: 'HomeServer-NAS',
    status: 'offline',
    type: 'local',
  },
];

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { localServer } = useOutletContext<{
    localServer: { name: string; ipAddress: string; status: 'online' | 'offline'; lastSeen?: string };
  }>();

  const handleConnect = (ipAddress: string, computerName: string) => {
    const newDevice: Device = {
      id: Date.now().toString(),
      name: computerName,
      ipAddress,
      computerName,
      status: 'online',
      type: ipAddress.startsWith('192.168') ? 'local' : 'internet',
    };
    setDevices([...devices, newDevice]);
    setIsModalOpen(false);
  };

  // Если локальный сервер оффлайн - показываем ошибку
  if (localServer.status === 'offline') {
    return <NetworkError serverName={localServer.name} serverIp={localServer.ipAddress} />;
  }

  return (
    <>
      <div className="px-6 py-8">
        {/* Title Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Устройства
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {devices.filter((d) => d.status === 'online').length} из {devices.length}{' '}
              устройств в сети
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Подключиться к сети
          </button>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>

        {/* Empty State */}
        {devices.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Нет подключенных устройств
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Добавьте первое устройство в сеть
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Подключиться к сети
            </button>
          </div>
        )}
      </div>

      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
      />
    </>
  );
}