import { useCallback, useMemo } from 'react';
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
import {
  CLAUDE_MODELS,
  CURSOR_MODELS,
  CODEX_MODELS,
  GEMINI_MODELS,
} from '../../../shared/modelConstants';
import SessionProviderLogo from '../llm-logo-provider/SessionProviderLogo';
import { cn } from '../../lib/utils';
import type { LLMProvider } from '../../types/app';

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

function getProviderDisplayName(p: string) {
  if (p === 'claude') return 'Claude';
  if (p === 'cursor') return 'Cursor';
  if (p === 'codex') return 'Codex';
  return 'Gemini';
}

function AskModelHero({
  provider,
  providerName,
  modelLabel,
  onTap,
}: {
  provider: LLMProvider;
  providerName: string;
  modelLabel: string;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex items-center gap-3 w-full px-3 py-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:bg-primary/15 active:bg-primary/20 transition-all duration-150"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 shrink-0">
        <SessionProviderLogo provider={provider} className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-semibold text-foreground">
          Ask <span className="text-primary">{providerName}</span> anything
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{modelLabel}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
    </button>
  );
}

interface BottomSheetContentProps {
  onClose: () => void;
  selectedEffort?: string;
  onEffortChange?: (effort: string) => void;
  permissionMode: string;
  cyclePermissionMode: () => void;
  onStartComposing: () => void;
}

export default function BottomSheetContent({ onClose, selectedEffort, onEffortChange, permissionMode, cyclePermissionMode, onStartComposing }: BottomSheetContentProps) {
  const navigate = useNavigate();

  const modelInfo = useMemo(() => {
    const storedProvider = (typeof window !== 'undefined'
      ? localStorage.getItem('selected-provider')
      : null) ?? 'claude';
    const providerName = getProviderDisplayName(storedProvider);

    const modelKey = `${storedProvider}-model`;
    const modelMap: Record<string, { value: string; label: string }[]> = {
      'claude-model': CLAUDE_MODELS.OPTIONS,
      'cursor-model': CURSOR_MODELS.OPTIONS,
      'codex-model': CODEX_MODELS.OPTIONS,
      'gemini-model': GEMINI_MODELS.OPTIONS,
    };
    const storedModel = typeof window !== 'undefined'
      ? localStorage.getItem(modelKey)
      : null;
    const defaultModel: Record<string, string> = {
      claude: CLAUDE_MODELS.DEFAULT,
      cursor: CURSOR_MODELS.DEFAULT,
      codex: CODEX_MODELS.DEFAULT,
      gemini: GEMINI_MODELS.DEFAULT,
    };

    const modelValue = storedModel ?? defaultModel[storedProvider] ?? 'opus';
    const found = modelMap[modelKey]?.find((m) => m.value === modelValue);

    return { provider: storedProvider as LLMProvider, providerName, modelLabel: found?.label ?? modelValue };
  }, []);

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
      {/* 1. Ask Model hero section */}
      <AskModelHero
        provider={modelInfo.provider}
        providerName={modelInfo.providerName}
        modelLabel={modelInfo.modelLabel}
        onTap={onStartComposing}
      />

      <div className="h-px bg-border/50" />

      {/* 2. Existing quick actions */}
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
