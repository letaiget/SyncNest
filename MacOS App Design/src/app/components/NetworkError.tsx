import { AlertTriangle, FolderX } from 'lucide-react';

interface NetworkErrorProps {
  serverName: string;
  serverIp: string;
}

export function NetworkError({ serverName, serverIp }: NetworkErrorProps) {
  return (
    <div className="px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-200 dark:border-red-800 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <FolderX className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Нет подключения к локальной сети
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Локальный сервер <span className="font-semibold">{serverName}</span> ({serverIp})
            не отвечает. Доступ к файлам и папкам временно недоступен.
          </p>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                  Возможные причины:
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>Сервер выключен или перезагружается</li>
                  <li>Проблемы с сетевым подключением</li>
                  <li>Сервер находится на техническом обслуживании</li>
                  <li>Превышено время ожидания ответа</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">Попробуйте следующее:</p>
            <ul className="space-y-1">
              <li>• Проверьте подключение к локальной сети</li>
              <li>• Убедитесь, что сервер включен</li>
              <li>• Обратитесь к администратору сети</li>
              <li>• Подождите неск��лько минут и обновите страницу</li>
            </ul>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    </div>
  );
}
