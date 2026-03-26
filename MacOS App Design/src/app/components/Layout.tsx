import { useState } from 'react';
import { Outlet } from 'react-router';
import { Header } from './Header';
import { ServerStatus } from './ServerStatus';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Текущее устройство (для демонстрации)
  const currentDevice = {
    deviceName: 'Мой MacBook Pro',
    ipAddress: '192.168.1.100',
    computerName: 'MacBook-Pro-Main',
  };

  // Статус локального сервера (для демонстрации - измените на 'offline' чтобы увидеть ошибку)
  const localServer = {
    name: 'HomeServer-Main',
    ipAddress: '192.168.1.1',
    status: 'online' as const, // Измените на 'offline' для тестирования
    lastSeen: '10 минут назад',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header {...currentDevice} onMenuClick={() => setIsSidebarOpen(true)} />
      <ServerStatus server={localServer} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main>
        <Outlet context={{ localServer }} />
      </main>
    </div>
  );
}