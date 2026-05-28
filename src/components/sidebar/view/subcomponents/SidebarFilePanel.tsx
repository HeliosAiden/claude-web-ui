import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';

import type { Project } from '../../../../types/app';
import type { FileTreeNode } from '../../../file-tree/types/types';
import type { UseFileTreeDataResult } from '../../../file-tree/hooks/useFileTreeData';
import { useFileTreeData } from '../../../file-tree/hooks/useFileTreeData';
import { useExpandedDirectories } from '../../../file-tree/hooks/useExpandedDirectories';
import { useFileTreeOperations } from '../../../file-tree/hooks/useFileTreeOperations';
import { getFileIconData, ICON_SIZE_CLASS } from '../../../file-tree/constants/fileIcons';
import { cn } from '../../../../lib/utils';
import { Button, Input } from '../../../../shared/view/ui';

type SidebarFilePanelProps = {
  selectedProject: Project | null;
  onFileOpen?: (filePath: string) => void;
  preloadedFileTree?: UseFileTreeDataResult;
};

function FileTreeRow({
  node,
  depth,
  expandedDirs,
  onToggle,
  onFileOpen,
}: {
  node: FileTreeNode;
  depth: number;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
  onFileOpen?: (filePath: string) => void;
}) {
  const isDir = node.type === 'directory';
  const isExpanded = expandedDirs.has(node.path);
  const hasChildren = isDir && node.children && node.children.length > 0;
  const { icon: Icon, color } = getFileIconData(node.name);

  const handleClick = () => {
    if (isDir && hasChildren) {
      onToggle(node.path);
    } else if (!isDir && onFileOpen) {
      onFileOpen(node.path);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1 py-0.5 pr-2 text-left text-[11px] transition-colors hover:bg-accent/50 rounded',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {isDir && hasChildren ? (
          <ChevronRight
            className={cn('h-3 w-3 flex-shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
          />
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}
        {isDir ? (
          isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          ) : (
            <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          )
        ) : (
          <Icon className={cn(ICON_SIZE_CLASS, 'h-3.5 w-3.5', color)} />
        )}
        <span className="truncate text-muted-foreground">{node.name}</span>
      </button>
      {isDir && isExpanded && node.children && (
        node.children.map((child) => (
          <FileTreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedDirs={expandedDirs}
            onToggle={onToggle}
            onFileOpen={onFileOpen}
          />
        ))
      )}
    </>
  );
}

function SidebarFilePanel({ selectedProject, onFileOpen, preloadedFileTree }: SidebarFilePanelProps) {
  const projectId = selectedProject?.projectId ?? null;
  const hookFiles = useFileTreeData(selectedProject);
  const { files, loading, refreshFiles } = preloadedFileTree ?? hookFiles;
  const { expandedDirs, toggleDirectory, collapseAll } = useExpandedDirectories();
  const [searchFilter, setSearchFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const operations = useFileTreeOperations({
    selectedProject,
    onRefresh: refreshFiles,
    showToast,
  });

  // Focus input when creating new item
  useEffect(() => {
    if (operations.isCreating && newItemInputRef.current) {
      newItemInputRef.current.focus();
      newItemInputRef.current.select();
    }
  }, [operations.isCreating]);

  const filterTree = useCallback(
    (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
      if (!query) return nodes;
      const lowerQuery = query.toLowerCase();
      return nodes.reduce<FileTreeNode[]>((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(lowerQuery);
        if (node.type === 'directory' && node.children) {
          const filteredChildren = filterTree(node.children, query);
          if (filteredChildren.length > 0 || nameMatch) {
            acc.push({ ...node, children: filteredChildren });
          }
        } else if (nameMatch) {
          acc.push(node);
        }
        return acc;
      }, []);
    },
    [],
  );

  const filteredFiles = filterTree(files, searchFilter.trim());

  if (!projectId) {
    return (
      <div className="px-3 py-8 text-center">
        <Folder className="mx-auto h-5 w-5 text-muted-foreground/40" />
        <p className="mt-2 text-xs text-muted-foreground">Select a project to browse files</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <span className="text-xs font-medium text-foreground">Files</span>
        <div className="flex items-center gap-0.5">
          {operations && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => operations.handleStartCreate('', 'file')}
                title="New File"
                aria-label="New File"
                disabled={operations.operationLoading}
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => operations.handleStartCreate('', 'directory')}
                title="New Folder"
                aria-label="New Folder"
                disabled={operations.operationLoading}
              >
                <FolderPlus className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => refreshFiles()}
            title="Refresh files"
            aria-label="Refresh files"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={collapseAll}
            title="Collapse All"
            aria-label="Collapse All"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-border/30 px-3 py-1.5">
        <input
          type="text"
          placeholder="Filter files..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full rounded-md border border-border/40 bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-border focus:outline-none"
        />
      </div>

      {/* Inline creation input */}
      {operations.isCreating && (
        <div className="flex items-center gap-1.5 border-b border-border/30 px-3 py-1">
          {operations.newItemType === 'directory' ? (
            <Folder className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
          ) : (
            <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          )}
          <Input
            ref={newItemInputRef}
            type="text"
            value={operations.newItemName}
            onChange={(e) => operations.setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') operations.handleConfirmCreate();
              if (e.key === 'Escape') operations.handleCancelCreate();
            }}
            onBlur={() => {
              setTimeout(() => {
                if (operations.isCreating) operations.handleConfirmCreate();
              }, 100);
            }}
            className="h-6 flex-1 text-[11px]"
            disabled={operations.operationLoading}
          />
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredFiles.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-muted-foreground/60">
            {files.length === 0 ? 'No files found' : 'No files match your filter'}
          </p>
        ) : (
          filteredFiles.map((node) => (
            <FileTreeRow
              key={node.path}
              node={node}
              depth={0}
              expandedDirs={expandedDirs}
              onToggle={toggleDirectory}
              onFileOpen={onFileOpen}
            />
          ))
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            'mx-3 mb-2 px-3 py-1.5 rounded-md shadow-sm flex items-center gap-2 text-[11px] animate-in slide-in-from-bottom-2',
            toast.type === 'success'
              ? 'bg-green-600/90 text-white'
              : 'bg-red-600/90 text-white'
          )}
        >
          {toast.type === 'success' ? (
            <Check className="h-3 w-3 flex-shrink-0" />
          ) : (
            <X className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default React.memo(SidebarFilePanel);
