import { useState } from 'react';
import { Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { getIconFromName } from '../utils/iconUtils';

interface FolderData {
  _id: string;
  name: string;
  parentFolder?: any;
  color?: string;
  icon?: string;
}

interface FolderSelectorProps {
  folders: FolderData[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function FolderSelector({ folders, value, onChange, disabled }: FolderSelectorProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const getRootFolders = () => {
    return folders.filter(f => !f.parentFolder || !f.parentFolder._id);
  };

  const getChildFolders = (parentId: string) => {
    return folders.filter(f => {
      const parentIdValue = typeof f.parentFolder === 'string' ? f.parentFolder : f.parentFolder?._id;
      return parentIdValue === parentId;
    });
  };

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFolderPath = (folderId: string): string[] => {
    const path: string[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f._id === currentId);
      if (!folder) break;
      path.unshift(folder.name);
      const parentId = typeof folder.parentFolder === 'string' 
        ? folder.parentFolder 
        : folder.parentFolder?._id;
      currentId = parentId || null;
    }
    
    return path;
  };

  const selectedFolder = folders.find(f => f._id === value);
  const displayText = selectedFolder 
    ? getFolderPath(value).join(' / ')
    : 'No Folder';

  const renderFolderTree = (parentId: string | null = null, level: number = 0): JSX.Element[] => {
    const foldersToRender = parentId
      ? getChildFolders(parentId)
      : getRootFolders();

    return foldersToRender.map((folder) => {
      const hasChildren = getChildFolders(folder._id).length > 0;
      const isExpanded = expandedFolders.has(folder._id);
      const isSelected = value === folder._id;

      return (
        <div key={folder._id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded ${
              isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(folder._id);
              setIsOpen(false);
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpand(folder._id);
                }}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <div
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: folder.color || '#3B82F6' }}
            />
            {(() => {
              const IconComponent = getIconFromName(folder.icon);
              return <IconComponent className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
            })()}
            <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {folder.name}
            </span>
          </div>
          {hasChildren && isExpanded && (
            <div>
              {renderFolderTree(folder._id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-left text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div 
            className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                setIsOpen(false);
              }}
            >
              <span className={`text-sm ${value === '' ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                No Folder
              </span>
            </div>
            {renderFolderTree()}
          </div>
        </>
      )}
    </div>
  );
}

