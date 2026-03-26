import {
  ArrowLeft,
  Download,
  File,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  MoreVertical,
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modifiedDate: string;
  fileType?: 'image' | 'video' | 'document' | 'other';
}

interface FolderContentProps {
  folderName: string;
  onBack: () => void;
}

const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Презентация проекта',
    type: 'folder',
    modifiedDate: '2 часа назад',
  },
  {
    id: '2',
    name: 'Документация.pdf',
    type: 'file',
    size: '2.4 МБ',
    modifiedDate: '5 минут назад',
    fileType: 'document',
  },
  {
    id: '3',
    name: 'Дизайн макеты',
    type: 'folder',
    modifiedDate: 'Вчера',
  },
  {
    id: '4',
    name: 'Screenshot_2024.png',
    type: 'file',
    size: '1.8 МБ',
    modifiedDate: '10 минут назад',
    fileType: 'image',
  },
  {
    id: '5',
    name: 'Видео инструкция.mp4',
    type: 'file',
    size: '45.2 МБ',
    modifiedDate: 'Сегодня',
    fileType: 'video',
  },
  {
    id: '6',
    name: 'README.txt',
    type: 'file',
    size: '512 КБ',
    modifiedDate: '1 час назад',
    fileType: 'document',
  },
  {
    id: '7',
    name: 'Исходный код.zip',
    type: 'file',
    size: '12.5 МБ',
    modifiedDate: '3 часа назад',
    fileType: 'other',
  },
  {
    id: '8',
    name: 'Архив 2024',
    type: 'folder',
    modifiedDate: '2 дня назад',
  },
];

export function FolderContent({ folderName, onBack }: FolderContentProps) {
  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }

    switch (item.fileType) {
      case 'image':
        return <FileImage className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'video':
        return <FileVideo className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'document':
        return <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <File className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад к папкам</span>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {folderName}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {mockFiles.length} элементов
        </p>
      </div>

      {/* Files Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-6 text-sm font-medium text-gray-700 dark:text-gray-300">
            Название
          </div>
          <div className="col-span-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Размер
          </div>
          <div className="col-span-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Изменено
          </div>
          <div className="col-span-1"></div>
        </div>

        {/* Files List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {mockFiles.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
            >
              <div className="col-span-6 flex items-center gap-3">
                <div className="flex-shrink-0">{getFileIcon(item)}</div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                </span>
              </div>

              <div className="col-span-2 flex items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.size || '—'}
                </span>
              </div>

              <div className="col-span-3 flex items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.modifiedDate}
                </span>
              </div>

              <div className="col-span-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'file' && (
                  <button
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Скачать"
                  >
                    <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                <button className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
