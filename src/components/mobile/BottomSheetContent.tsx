import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  FileText,
  Search,
  Zap,
  Brain,
  Shield,
  Cpu,
  Bot,
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
import type { PermissionMode } from '../chat/types/types';

const EFFORT_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'X-High' },
  { value: 'max', label: 'Max' },
];

const AGENT_OPTIONS = [
  { value: 'claude', label: 'Claude' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'codex', label: 'Codex' },
  { value: 'gemini', label: 'Gemini' },
] as const;

const PROVIDER_BRAND_COLORS: Record<string, string> = {
  claude: '#CC785C',
  cursor: '#6A6AF4',
  codex: '#22C55E',
  gemini: '#4285F4',
};

const MODE_META: {
  value: PermissionMode;
  label: string;
  color: string;
  description: string;
}[] = [
  { value: 'default', label: 'Default', color: '#6B7280', description: 'Prompt before every action' },
  { value: 'auto', label: 'Auto', color: '#F59E0B', description: 'Auto-approve safe actions' },
  { value: 'acceptEdits', label: 'Accept edits', color: '#8B5CF6', description: 'Auto-approve file edits' },
  { value: 'plan', label: 'Plan', color: '#14B8A6', description: 'Plan only, no execution' },
  { value: 'bypassPermissions', label: 'Bypass', color: '#EF4444', description: 'Always allow all actions' },
];

/** Per-provider mode cycle order. Each provider only shows the modes it supports. */
export const PROVIDER_MODE_ORDER: Record<string, PermissionMode[]> = {
  claude: ['default', 'auto', 'acceptEdits', 'plan', 'bypassPermissions'],
  cursor: ['default', 'bypassPermissions'],
  codex: ['default', 'acceptEdits', 'bypassPermissions'],
  gemini: ['default', 'acceptEdits', 'plan', 'bypassPermissions'],
};

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
  providerColor,
}: {
  provider: LLMProvider;
  providerName: string;
  modelLabel: string;
  onTap: () => void;
  providerColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-3 py-4 transition-all duration-150 hover:bg-primary/15 active:bg-primary/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <SessionProviderLogo provider={provider} className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-semibold text-foreground">
          Ask <span style={{ color: providerColor }}>{providerName}</span> anything
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{modelLabel}</div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
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
  selectedModel?: string;
  onModelSelect?: (model: string) => void;
  selectedProvider: string;
  onProviderSelect: (provider: string) => void;
}

export default function BottomSheetContent({ onClose, selectedEffort, onEffortChange, permissionMode, cyclePermissionMode, onStartComposing, selectedModel, onModelSelect, selectedProvider, onProviderSelect }: BottomSheetContentProps) {
  const navigate = useNavigate();

  const modelInfo = useMemo(() => {
    const storedProvider = selectedProvider;
    const providerName = getProviderDisplayName(storedProvider);

    const modelKey = `${storedProvider}-model`;
    const modelMap: Record<string, { value: string; label: string }[]> = {
      'claude-model': CLAUDE_MODELS.OPTIONS,
      'cursor-model': CURSOR_MODELS.OPTIONS,
      'codex-model': CODEX_MODELS.OPTIONS,
      'gemini-model': GEMINI_MODELS.OPTIONS,
    };
    const defaultModel: Record<string, string> = {
      claude: CLAUDE_MODELS.DEFAULT,
      cursor: CURSOR_MODELS.DEFAULT,
      codex: CODEX_MODELS.DEFAULT,
      gemini: GEMINI_MODELS.DEFAULT,
    };

    // Use selectedModel prop if available, otherwise fall back to localStorage, then default
    const modelValue = selectedModel
      || (typeof window !== 'undefined' ? localStorage.getItem(modelKey) : null)
      || defaultModel[storedProvider]
      || 'opus';
    const found = modelMap[modelKey]?.find((m) => m.value === modelValue);

    return {
      provider: storedProvider as LLMProvider,
      providerName,
      modelLabel: found?.label ?? modelValue,
      modelOptions: modelMap[modelKey] ?? [],
      currentModelValue: modelValue,
    };
  }, [selectedProvider, selectedModel]);

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
    },
    [onEffortChange],
  );

  const handleCyclePermission = useCallback(() => {
    cyclePermissionMode();
  }, [cyclePermissionMode]);

  const SectionHeader = ({ label, icon: Icon }: { label: string; icon: typeof Search }) => (
    <div className="flex items-center gap-2 px-1 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
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
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-accent/50 active:bg-accent"
    >
      <Icon className="h-5 w-5 shrink-0 text-foreground" />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {trailing ?? <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  );

  const currentModeMeta = MODE_META.find((m) => m.value === permissionMode) ?? MODE_META[0];

  return (
    <div className="flex flex-col gap-2">
      {/* 1. Ask Model hero section */}
      <AskModelHero
        provider={modelInfo.provider}
        providerName={modelInfo.providerName}
        modelLabel={modelInfo.modelLabel}
        onTap={onStartComposing}
        providerColor={PROVIDER_BRAND_COLORS[selectedProvider] ?? '#CC785C'}
      />

      <div className="h-px bg-border/50" />

      {/* Agent selection */}
      <SectionHeader label="Agent" icon={Bot} />
      <div className="flex flex-wrap gap-1.5 px-1">
        {AGENT_OPTIONS.map((agent) => {
          const isSelected = selectedProvider === agent.value;
          const brandColor = PROVIDER_BRAND_COLORS[agent.value];
          return (
            <button
              key={agent.value}
              type="button"
              onClick={() => onProviderSelect(agent.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                isSelected
                  ? 'text-white'
                  : 'bg-accent text-foreground hover:bg-accent/80',
              )}
              style={isSelected ? { backgroundColor: brandColor } : undefined}
            >
              <SessionProviderLogo provider={agent.value} className="h-3.5 w-3.5" />
              {agent.label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-border/50" />

      {/* 1b. Model selection */}
      <SectionHeader label="Model" icon={Cpu} />
      <div className="flex flex-wrap gap-1.5 px-1">
        {modelInfo.modelOptions.map((m) => {
          const isSelected = (selectedModel || modelInfo.currentModelValue) === m.value;
          const brandColor = PROVIDER_BRAND_COLORS[selectedProvider];
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onModelSelect?.(m.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150',
                isSelected ? 'text-white' : 'bg-accent text-foreground hover:bg-accent/80',
              )}
              style={isSelected ? { backgroundColor: brandColor } : undefined}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-border/50" />

      {/* 2. Existing quick actions */}
      <SectionHeader label="Quick Actions" icon={Zap} />
      <div className="flex flex-col gap-0.5">
        <ActionRow icon={Search} label="Search" description="Search all conversations" onClick={handleSearch} />
        <ActionRow icon={Bookmark} label="Bookmarks" description="View saved bookmarks" onClick={handleBookmarks} />
        <ActionRow icon={FileText} label="Prompt Templates" description="View saved templates" onClick={handleTemplates} />
      </div>

      {selectedProvider === 'claude' && (
        <>
          <div className="my-1 h-px bg-border/50" />

          <SectionHeader label="Effort" icon={Brain} />
          <div className="flex flex-wrap gap-1.5 px-1">
            {EFFORT_LEVELS.map((level) => {
              const isSelected = selectedEffort === level.value;
              const brandColor = PROVIDER_BRAND_COLORS[selectedProvider];
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleEffortChange(level.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150',
                    isSelected ? 'text-white' : 'bg-accent text-foreground hover:bg-accent/80',
                  )}
                  style={isSelected ? { backgroundColor: brandColor } : undefined}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="my-1 h-px bg-border/50" />

      {/* Mode selection — full-width tap target with color-coded chips + description */}
      <SectionHeader label="Mode" icon={Shield} />
      <button
        type="button"
        onClick={handleCyclePermission}
        className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all duration-150 hover:bg-accent/50 active:bg-accent"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: currentModeMeta.color + '20' }}
        >
          <Shield className="h-4 w-4" style={{ color: currentModeMeta.color }} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: currentModeMeta.color }}
            >
              {currentModeMeta.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{currentModeMeta.description}</div>
        </div>
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-transform duration-150 active:scale-90"
          style={{ backgroundColor: currentModeMeta.color }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </button>
    </div>
  );
}
