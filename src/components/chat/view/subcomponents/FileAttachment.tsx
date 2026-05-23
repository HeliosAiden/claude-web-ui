import { PaperclipIcon, XIcon } from 'lucide-react';

interface FileAttachmentProps {
  file: File;
  onRemove: () => void;
  uploadProgress?: number;
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileAttachment = ({ file, onRemove, uploadProgress, error }: FileAttachmentProps) => {
  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 pr-8">
      <PaperclipIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
      </div>
      {uploadProgress !== undefined && uploadProgress < 100 && (
        <div className="text-xs text-muted-foreground">{uploadProgress}%</div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/50">
          <XIcon className="h-4 w-4 text-white" />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white opacity-100 transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Remove file"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
};

export default FileAttachment;
