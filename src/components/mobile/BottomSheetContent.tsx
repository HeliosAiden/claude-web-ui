import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  FileText,
  Search,
  Zap,
  Brain,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const EFFORT_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'X-High' },
  { value: 'max', label: 'Max' },
];

const PERMISSION_MODES = [
  { value: 'default', label: 'Default' },
  { value: 'auto', label: 'Auto' },
  { value: 'plan', label: 'Plan' },
  { value: 'accept', label: 'Accept edits' },
  { value: 'bypass', label: 'Bypass permissions' },
];

interface BottomSheetContentProps {
  onClose: () => void;
  selectedEffort?: string;
  onEffortChange?: (effort: string) => void;
  permissionMode: string;
  cyclePermissionMode: () => void;
}

export default function BottomSheetContent({ onClose, selectedEffort, onEffortChange, permissionMode, cyclePermissionMode }: BottomSheetContentProps) {
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    navigate('/conversations');
    onClose();
  }, [navigate, onClose]);

  const handleBookmarks = useCallback(() => {
    navigate('/conversations');
    onClose();
  }, [navigate, onClose]);

  const handleTemplates = useCallback(() => {
    navigate('/conversations');
    onClose();
  }, [navigate, onClose]);

  const handleEffortChange = useCallback(
    (effort: string) => {
      onEffortChange?.(effort);
      onClose();
    },
    [onEffortChange, onClose],
  );

  const handleCyclePermission = useCallback(() => {
    cyclePermissionMode();
    onClose();
  }, [cyclePermissionMode, onClose]);

  const SectionHeader = ({ label, icon: Icon }: { label: string; icon: typeof Search }) => (
    <div className="flex items-center gap-2 px-1 py-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );

  const ActionRow = ({
    icon: Icon,
    label,
    description,
    onClick,
    trailing,
  }: {
    icon: typeof Search;
    label: string;
    description?: string;
    onClick: () => void;
    trailing?: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-accent/50 active:bg-accent transition-colors duration-150"
    >
      <Icon className="w-5 h-5 text-foreground shrink-0" />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing ?? <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader label="Quick Actions" icon={Zap} />
      <div className="flex flex-col gap-0.5">
        <ActionRow icon={Search} label="Search" description="Search all conversations" onClick={handleSearch} />
        <ActionRow icon={Bookmark} label="Bookmarks" description="View saved bookmarks" onClick={handleBookmarks} />
        <ActionRow icon={FileText} label="Prompt Templates" description="View saved templates" onClick={handleTemplates} />
      </div>

      <div className="h-px bg-border/50 my-1" />

      <SectionHeader label="Effort" icon={Brain} />
      <div className="flex flex-wrap gap-1.5 px-1">
        {EFFORT_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => handleEffortChange(level.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150',
              selectedEffort === level.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent text-foreground hover:bg-accent/80',
            )}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-border/50 my-1" />

      <SectionHeader label="Mode" icon={Shield} />
      <ActionRow
        icon={Shield}
        label={PERMISSION_MODES.find((m) => m.value === permissionMode)?.label ?? permissionMode}
        description="Tap to cycle permission modes"
        onClick={handleCyclePermission}
        trailing={
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {PERMISSION_MODES.find((m) => m.value === permissionMode)?.label ?? permissionMode}
          </span>
        }
      />
    </div>
  );
}
