import {
  CheckCircle,
  ChevronRight,
  Clock,
  Folder,
  MoreVertical,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

export interface SharedFolder {
  id: string;
  name: string;
  path: string;
  size: string;
  filesCount: number;
  syncStatus: 'synced' | 'syncing' | 'pending';
  lastSync: string;
}

interface FolderCardProps {
  folder: SharedFolder;
  onOpen: (folder: SharedFolder) => void;
  onDelete: (folderId: string) => void;
}

export function FolderCard({ folder, onOpen, onDelete }: FolderCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getSyncIcon = () => {
    switch (folder.syncStatus) {
      case 'synced':
        return (
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Синхронизирована</span>
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">Синхронизация...</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Ожидание</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {folder.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {folder.path}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20">
                  <button
                    onClick={() => {
                      onDelete(folder.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить папку
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <div className="mb-4">{getSyncIcon()}</div>

        {/* Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span>{folder.filesCount} файлов</span>
          <span>{folder.size}</span>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Обновлено: {folder.lastSync}
        </div>

        {/* Open Button */}
        <button
          onClick={() => onOpen(folder)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <span>Открыть папку</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
