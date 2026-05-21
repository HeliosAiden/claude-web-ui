import React, { useCallback, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, RefreshCw, ExternalLink } from 'lucide-react';
import type { Project, AppTab } from '../../../../types/app';
import type { FileTreeNode } from '../../../file-tree/types/types';
import { useFileTreeData } from '../../../file-tree/hooks/useFileTreeData';
import { getFileIconData, ICON_SIZE_CLASS } from '../../../file-tree/constants/fileIcons';
import { cn } from '../../../../lib/utils';

type SidebarFilePanelProps = {
  selectedProject: Project | null;
  onNavigateToTab?: (tab: AppTab) => void;
  onFileOpen?: (filePath: string) => void;
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

function SidebarFilePanel({ selectedProject, onNavigateToTab, onFileOpen }: SidebarFilePanelProps) {
  const projectId = selectedProject?.projectId ?? null;
  const { files, loading, refreshFiles } = useFileTreeData(selectedProject);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-xs font-medium text-foreground">Files</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => refreshFiles()}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Refresh files"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-border/30">
        <input
          type="text"
          placeholder="Filter files..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full rounded-md border border-border/40 bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border"
        />
      </div>

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
              onToggle={toggleDir}
              onFileOpen={onFileOpen}
            />
          ))
        )}
      </div>

      {/* Open full panel link */}
      <div className="flex-shrink-0 border-t border-border/40 px-3 py-2">
        <button
          type="button"
          onClick={() => onNavigateToTab?.('files')}
          className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open Full Panel
        </button>
      </div>
    </div>
  );
}

export default React.memo(SidebarFilePanel);
