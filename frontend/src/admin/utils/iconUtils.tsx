import * as LucideIcons from 'lucide-react';
import { Folder } from 'lucide-react';

// Type for Lucide icon component
type IconComponent = React.ComponentType<{ className?: string; size?: number | string }>;

/**
 * Get an icon component from a string name
 * Falls back to Folder icon if the icon name is not found
 */
export function getIconFromName(iconName?: string): IconComponent {
  if (!iconName || !iconName.trim()) {
    return Folder;
  }

  // Convert icon name to PascalCase (e.g., "book-open" -> "BookOpen")
  const pascalCaseName = iconName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Try to find the icon in lucide-react
  const IconComponent = (LucideIcons as any)[pascalCaseName] as IconComponent;

  // If icon not found, return default Folder icon
  return IconComponent || Folder;
}

/**
 * Common icon names that users might use (Lucide icon names)
 * Examples: "book", "book-open", "file-text", "video", "image", "music", etc.
 */
export const SUGGESTED_ICONS = [
  'folder',
  'folder-open',
  'book',
  'book-open',
  'file-text',
  'file',
  'video',
  'image',
  'music',
  'archive',
  'folder-plus',
  'folder-minus',
  'folder-check',
  'folder-x',
  'folder-edit',
  'folder-search',
  'folder-code',
  'folder-heart',
  'folder-key',
  'folder-lock',
  'folder-question',
  'folder-star',
  'folder-up',
  'folder-down',
  'folder-chart',
  'folder-database',
  'folder-download',
  'folder-upload',
  'folder-video',
  'folder-image',
  'folder-music',
  'folder-settings',
  'folder-document',
  'folder-notebook',
  'folder-presentation',
  'folder-spreadsheet',
  'folder-template',
  'folder-share',
  'folder-cloud',
  'folder-project',
  'folder-work',
  'folder-personal',
  'folder-important',
  'folder-favorite',
  'folder-recent',
  'folder-downloads',
  'folder-uploads',
  'folder-temp',
  'folder-cache',
  'folder-logs',
  'folder-data',
  'folder-models',
  'folder-scripts',
  'folder-styles',
  'folder-assets',
  'folder-resources',
  'folder-media',
  'folder-content',
  'folder-pages',
  'folder-components',
  'folder-utils',
  'folder-helpers',
  'folder-tests',
  'folder-docs',
  'folder-api',
  'folder-routes',
  'folder-middleware',
  'folder-controllers',
  'folder-services',
  'folder-types',
  'folder-constants',
];

