import { AlertCircle, CheckCircle, Server, Wifi, WifiOff } from 'lucide-react';

interface LocalServer {
  name: string;
  ipAddress: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

interface ServerStatusProps {
  server: LocalServer;
}

export function ServerStatus({ server }: ServerStatusProps) {
  const isOnline = server.status === 'online';

  return (
    <div
      className={`border-b border-gray-200 dark:border-gray-800 ${
        isOnline
          ? 'bg-green-50 dark:bg-green-900/10'
          : 'bg-red-50 dark:bg-red-900/10'
      }`}
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isOnline
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <Server
                className={`w-4 h-4 ${
                  isOnline
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Локальный сервер: {server.name}
                </span>
                {isOnline ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>{server.ipAddress} • Подключено</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>
                      {server.ipAddress} • Не в сети
                      {server.lastSeen && ` • Последний раз онлайн: ${server.lastSeen}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isOnline
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {isOnline ? 'Активен' : 'Недоступен'}
          </div>
        </div>

        {!isOnline && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-900 dark:text-red-200 mb-1">
                  Ошибка подключения к локальной сети
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs">
                  Доступ к файлам и папкам недоступен. Проверьте подключение
                  локального сервера или обратитесь к администратору сети.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
