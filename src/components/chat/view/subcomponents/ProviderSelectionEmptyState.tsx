import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { authenticatedFetch } from "../../../../utils/api";

import { useServerPlatform } from "../../../../hooks/useServerPlatform";
import SessionProviderLogo from "../../../llm-logo-provider/SessionProviderLogo";
import {
  CLAUDE_MODELS,
  CURSOR_MODELS,
  CODEX_MODELS,
  GEMINI_MODELS,
  PROVIDERS,
} from "../../../../../shared/modelConstants";
import type { ProjectSession, LLMProvider } from "../../../../types/app";
import type { ProviderAuthStatusMap } from "../../../provider-auth/types";
import { NextTaskBanner } from "../../../task-master";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Card,
  Input,
} from "../../../../shared/view/ui";

const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

type ProviderSelectionEmptyStateProps = {
  selectedSession: ProjectSession | null;
  currentSessionId: string | null;
  provider: LLMProvider;
  setProvider: (next: LLMProvider) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  claudeModel: string;
  setClaudeModel: (model: string) => void;
  cursorModel: string;
  setCursorModel: (model: string) => void;
  codexModel: string;
  setCodexModel: (model: string) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  fccModels: { value: string; label: string }[];
  providerAuthStatus: ProviderAuthStatusMap;
  tasksEnabled: boolean;
  isTaskMasterInstalled: boolean | null;
  onShowAllTasks?: (() => void) | null;
  setInput: React.Dispatch<React.SetStateAction<string>>;
};

type ProviderGroup = {
  id: LLMProvider;
  name: string;
  models: { value: string; label: string }[];
};

const PROVIDER_GROUPS: ProviderGroup[] = PROVIDERS.map((p) => ({
  id: p.id as LLMProvider,
  name: p.name,
  models: p.models.OPTIONS,
}));

function getModelConfig(p: LLMProvider) {
  if (p === "claude") return CLAUDE_MODELS;
  if (p === "codex") return CODEX_MODELS;
  if (p === "gemini") return GEMINI_MODELS;
  return CURSOR_MODELS;
}

function getCurrentModel(
  p: LLMProvider,
  c: string,
  cu: string,
  co: string,
  g: string,
) {
  if (p === "claude") return c;
  if (p === "codex") return co;
  if (p === "gemini") return g;
  return cu;
}

function getProviderDisplayName(p: LLMProvider) {
  if (p === "claude") return "Claude";
  if (p === "cursor") return "Cursor";
  if (p === "codex") return "Codex";
  return "Gemini";
}

export default function ProviderSelectionEmptyState({
  selectedSession,
  currentSessionId,
  provider,
  setProvider,
  textareaRef,
  claudeModel,
  setClaudeModel,
  cursorModel,
  setCursorModel,
  codexModel,
  setCodexModel,
  geminiModel,
  setGeminiModel,
  fccModels,
  providerAuthStatus,
  tasksEnabled,
  isTaskMasterInstalled,
  onShowAllTasks,
  setInput,
}: ProviderSelectionEmptyStateProps) {
  const { t } = useTranslation("chat");
  const { isWindowsServer } = useServerPlatform();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'not_configured' | 'not_ready' } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const testModel = useCallback(async (modelValue: string) => {
    const isFccModel = fccModels.some(m => m.value === modelValue);
    const endpoint = isFccModel ? '/api/fcc/test-model' : '/api/models/test';
    try {
      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelValue }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast({ message: `Model "${modelValue}" is ready`, type: 'success' });
      } else if (data.reason === 'not_configured') {
        setToast({ message: data.error || `Model "${modelValue}" is not configured`, type: 'not_configured' });
      } else {
        setToast({ message: data.error || `Model "${modelValue}" is not ready`, type: 'not_ready' });
      }
    } catch {
      setToast({ message: `Could not verify model "${modelValue}"`, type: 'not_ready' });
    }
  }, [fccModels]);

  const visibleProviderGroups = useMemo(
    () => {
      let groups = isWindowsServer
        ? PROVIDER_GROUPS.filter((p) => p.id !== "cursor")
        : [...PROVIDER_GROUPS];
      // Filter out providers whose CLI is not configured (always keep Claude)
      groups = groups.filter(group => {
        if (group.id === 'claude') return true;
        const status = providerAuthStatus[group.id];
        if (!status || status.loading) return true; // keep while loading to avoid layout flash
        return status.authenticated;
      });
      // Inject FCC-discovered models into the Claude group
      if (fccModels.length > 0) {
        groups = groups.map(group => {
          if (group.id !== 'claude') return group;
          const fccValues = new Set(fccModels.map(m => m.value));
          // Keep only hardcoded models that aren't already in FCC list (avoid duplicates)
          const mergedModels = [
            ...fccModels,
            ...group.models.filter(m => !fccValues.has(m.value)),
          ];
          return { ...group, models: mergedModels };
        });
      }
      return groups;
    },
    [isWindowsServer, fccModels, providerAuthStatus],
  );

  useEffect(() => {
    if (isWindowsServer && provider === "cursor") {
      setProvider("claude");
      localStorage.setItem("selected-provider", "claude");
    }
  }, [isWindowsServer, provider, setProvider]);

  const nextTaskPrompt = t("tasks.nextTaskPrompt", {
    defaultValue: "Start the next task",
  });

  const currentModel = getCurrentModel(
    provider,
    claudeModel,
    cursorModel,
    codexModel,
    geminiModel,
  );

  const currentModelLabel = useMemo(() => {
    const config = getModelConfig(provider);
    const found = config.OPTIONS.find(
      (o: { value: string; label: string }) => o.value === currentModel,
    );
    return found?.label || currentModel;
  }, [provider, currentModel]);

  const setModelForProvider = useCallback(
    (providerId: LLMProvider, modelValue: string) => {
      if (providerId === "claude") {
        setClaudeModel(modelValue);
        localStorage.setItem("claude-model", modelValue);
      } else if (providerId === "codex") {
        setCodexModel(modelValue);
        localStorage.setItem("codex-model", modelValue);
      } else if (providerId === "gemini") {
        setGeminiModel(modelValue);
        localStorage.setItem("gemini-model", modelValue);
      } else {
        setCursorModel(modelValue);
        localStorage.setItem("cursor-model", modelValue);
      }
    },
    [setClaudeModel, setCursorModel, setCodexModel, setGeminiModel],
  );

  const handleModelSelect = useCallback(
    (providerId: LLMProvider, modelValue: string) => {
      setProvider(providerId);
      localStorage.setItem("selected-provider", providerId);
      setModelForProvider(providerId, modelValue);
      setDialogOpen(false);
      setCustomModel("");
      setTimeout(() => textareaRef.current?.focus(), 100);
      // Test the model if it's an FCC-discovered model
      testModel(modelValue);
    },
    [setProvider, setModelForProvider, textareaRef, testModel],
  );

  const handleCustomModelSubmit = useCallback(() => {
    const trimmed = customModel.trim();
    if (!trimmed) return;
    handleModelSelect(provider, trimmed);
  }, [customModel, provider, handleModelSelect]);

  if (!selectedSession && !currentSessionId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {t("providerSelection.title")}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("providerSelection.description")}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Card
                className="group mx-auto max-w-xs cursor-pointer border-border/60 transition-all duration-150 hover:border-border hover:shadow-md active:scale-[0.99]"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-2 p-3">
                  <SessionProviderLogo
                    provider={provider}
                    className="h-5 w-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-foreground">
                        {getProviderDisplayName(provider)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="truncate text-xs text-foreground">
                        {currentModelLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("providerSelection.clickToChange", {
                        defaultValue: "Click to change model",
                      })}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                </div>
              </Card>
            </DialogTrigger>

            <DialogContent className="max-w-md overflow-hidden p-0">
              <DialogTitle>Model Selector</DialogTitle>
              <Command>
                <CommandInput
                  placeholder={t("providerSelection.searchModels", {
                    defaultValue: "Search models...",
                  })}
                />
                <CommandList className="max-h-[350px]">
                  <CommandEmpty>
                    {t("providerSelection.noModelsFound", {
                      defaultValue: "No models found.",
                    })}
                  </CommandEmpty>
                  {visibleProviderGroups.map((group, idx) => (
                    <CommandGroup
                      key={group.id}
                      className={
                        idx > 0
                          ? "border-t border-border/40 [&_[cmdk-group-heading]]:mt-1 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                          : "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      }
                      heading={
                        <span className="flex items-center gap-1.5">
                          <SessionProviderLogo provider={group.id} className="h-3.5 w-3.5 shrink-0" />
                          {group.name}
                        </span>
                      }
                    >
                      {group.models.map((model) => {
                        const isSelected = provider === group.id && currentModel === model.value;
                        return (
                          <CommandItem
                            key={`${group.id}-${model.value}`}
                            value={`${group.name} ${model.label}`}
                            onSelect={() => handleModelSelect(group.id, model.value)}
                            className="ml-4 border-l border-border/40 pl-4"
                          >
                            <span className="flex-1 truncate">{model.label}</span>
                            {isSelected && (
                              <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
              <div className="border-t border-border/40 px-3 py-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCustomModelSubmit();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      <SessionProviderLogo provider={provider} className="h-3.5 w-3.5 shrink-0" />
                      {getProviderDisplayName(provider)}
                    </span>
                    <Input
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder={t("providerSelection.customModelPlaceholder", {
                        defaultValue: "Custom model...",
                      })}
                      className="h-7 text-xs"
                    />
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          <p className="mt-4 text-center text-sm text-muted-foreground/70">
            {
              {
                claude: t("providerSelection.readyPrompt.claude", {
                  model: claudeModel,
                }),
                cursor: t("providerSelection.readyPrompt.cursor", {
                  model: cursorModel,
                }),
                codex: t("providerSelection.readyPrompt.codex", {
                  model: codexModel,
                }),
                gemini: t("providerSelection.readyPrompt.gemini", {
                  model: geminiModel,
                }),
              }[provider]
            }
          </p>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/60">
            <Trans
              i18nKey="providerSelection.pressToSearch"
              values={{ shortcut: MOD_KEY === "⌘" ? "⌘K" : "Ctrl+K" }}
              components={{
                kbd: (
                  <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]" />
                ),
              }}
            />
          </p>

          {provider && tasksEnabled && isTaskMasterInstalled && (
            <div className="mt-5">
              <NextTaskBanner
                onStartTask={() => setInput(nextTaskPrompt)}
                onShowAllTasks={onShowAllTasks}
              />
            </div>
          )}

          {/* Model test toast */}
          {toast && (
            <div
              className={
                toast.type === 'success'
                  ? 'fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-green-600 text-white animate-in slide-in-from-bottom-2'
                  : toast.type === 'not_configured'
                    ? 'fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-amber-500 text-white animate-in slide-in-from-bottom-2'
                    : 'fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-red-600 text-white animate-in slide-in-from-bottom-2'
              }
            >
              {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              <span className="text-sm">{toast.message}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md px-6 text-center">
          <p className="mb-1.5 text-lg font-semibold text-foreground">
            {t("session.continue.title")}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("session.continue.description")}
          </p>

          {tasksEnabled && isTaskMasterInstalled && (
            <div className="mt-5">
              <NextTaskBanner
                onStartTask={() => setInput(nextTaskPrompt)}
                onShowAllTasks={onShowAllTasks}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
