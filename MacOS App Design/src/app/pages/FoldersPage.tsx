import { FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { AddFolderModal } from '../components/AddFolderModal';
import { FolderCard, SharedFolder } from '../components/FolderCard';
import { FolderContent } from '../components/FolderContent';
import { NetworkError } from '../components/NetworkError';

const initialFolders: SharedFolder[] = [
  {
    id: '1',
    name: 'Проектная документация',
    path: '/Users/main/Documents/Projects',
    size: '2.3 ГБ',
    filesCount: 47,
    syncStatus: 'synced',
    lastSync: '2 минуты назад',
  },
  {
    id: '2',
    name: 'Медиа файлы',
    path: '/Users/main/Media/Videos',
    size: '15.7 ГБ',
    filesCount: 124,
    syncStatus: 'syncing',
    lastSync: 'Синхронизируется...',
  },
  {
    id: '3',
    name: 'Исходный код',
    path: '/Users/main/Development/Sources',
    size: '892 МБ',
    filesCount: 234,
    syncStatus: 'synced',
    lastSync: '5 минут назад',
  },
  {
    id: '4',
    name: 'Резервные копии',
    path: '/Users/main/Backups',
    size: '8.4 ГБ',
    filesCount: 89,
    syncStatus: 'pending',
    lastSync: '30 минут назад',
  },
];

export function FoldersPage() {
  const [folders, setFolders] = useState<SharedFolder[]>(initialFolders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<SharedFolder | null>(null);

  const { localServer } = useOutletContext<{
    localServer: {
      name: string;
      ipAddress: string;
      status: 'online' | 'offline';
      lastSeen?: string;
    };
  }>();

  // Симуляция изменения статуса синхронизации
  useEffect(() => {
    const interval = setInterval(() => {
      setFolders((currentFolders) =>
        currentFolders.map((folder) => {
          if (folder.syncStatus === 'syncing') {
            // Иногда завершаем синхронизацию
            if (Math.random() > 0.7) {
              return {
                ...folder,
                syncStatus: 'synced',
                lastSync: 'Только что',
              };
            }
          } else if (folder.syncStatus === 'pending') {
            // Иногда начинаем синхронизацию
            if (Math.random() > 0.8) {
              return {
                ...folder,
                syncStatus: 'syncing',
                lastSync: 'Синхронизируется...',
              };
            }
          }
          return folder;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleAddFolder = (name: string, path: string) => {
    const newFolder: SharedFolder = {
      id: Date.now().toString(),
      name,
      path,
      size: '0 МБ',
      filesCount: 0,
      syncStatus: 'pending',
      lastSync: 'Ожидание синхронизации',
    };
    setFolders([...folders, newFolder]);

    // Через 2 секунды начинаем синхронизацию
    setTimeout(() => {
      setFolders((current) =>
        current.map((f) =>
          f.id === newFolder.id
            ? { ...f, syncStatus: 'syncing', lastSync: 'Синхронизируется...' }
            : f
        )
      );
    }, 2000);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту папку из сети?')) {
      setFolders(folders.filter((f) => f.id !== folderId));
    }
  };

  const handleOpenFolder = (folder: SharedFolder) => {
    setSelectedFolder(folder);
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
  };

  // Если локальный сервер оффлайн - показываем ошибку
  if (localServer.status === 'offline') {
    return (
      <NetworkError
        serverName={localServer.name}
        serverIp={localServer.ipAddress}
      />
    );
  }

  // Если выбрана папка - показываем её содержимое
  if (selectedFolder) {
    return (
      <FolderContent
        folderName={selectedFolder.name}
        onBack={handleBackToFolders}
      />
    );
  }

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Общие папки
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {folders.length} папок в локальной сети
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/30"
        >
          <FolderPlus className="w-5 h-5" />
          <span>Добавить папку</span>
        </button>
      </div>

      {/* Folders Grid */}
      {folders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onOpen={handleOpenFolder}
              onDelete={handleDeleteFolder}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <FolderPlus className="w-10 h-10 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Нет общих папок
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Добавьте первую папку для совместного доступа в сети
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <FolderPlus className="w-5 h-5" />
            <span>Добавить папку</span>
          </button>
        </div>
      )}

      {/* Add Folder Modal */}
      <AddFolderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddFolder}
      />
    </div>
  );
}
