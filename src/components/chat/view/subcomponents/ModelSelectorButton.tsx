import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

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
import type { LLMProvider } from "../../../../types/app";
import type { ProviderAuthStatusMap } from "../../../provider-auth/types";
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
  Input,
} from "../../../../shared/view/ui";

type ModelSelectorButtonProps = {
  provider: LLMProvider;
  setProvider: (next: LLMProvider) => void;
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
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
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

function getCurrentModel(p: LLMProvider, c: string, cu: string, co: string, g: string) {
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

export default function ModelSelectorButton({
  provider,
  setProvider,
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
  textareaRef,
}: ModelSelectorButtonProps) {
  const { isWindowsServer } = useServerPlatform();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'not_configured' | 'not_ready' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (isWindowsServer && provider === "cursor") {
      setProvider("claude");
      localStorage.setItem("selected-provider", "claude");
    }
  }, [isWindowsServer, provider, setProvider]);

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

  const visibleProviderGroups = useMemo(() => {
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
    if (fccModels.length > 0) {
      groups = groups.map(group => {
        if (group.id !== 'claude') return group;
        const fccValues = new Set(fccModels.map(m => m.value));
        const mergedModels = [
          ...fccModels,
          ...group.models.filter(m => !fccValues.has(m.value)),
        ];
        return { ...group, models: mergedModels };
      });
    }
    return groups;
  }, [isWindowsServer, fccModels, providerAuthStatus]);

  const currentModel = getCurrentModel(provider, claudeModel, cursorModel, codexModel, geminiModel);
  const currentModelLabel = useMemo(() => {
    const config = getModelConfig(provider);
    const found = config.OPTIONS.find(o => o.value === currentModel);
    if (found) return found.label;
    const fccFound = fccModels.find(m => m.value === currentModel);
    if (fccFound) return fccFound.label;
    return currentModel;
  }, [provider, currentModel, fccModels]);

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
      setTimeout(() => textareaRef?.current?.focus(), 100);
      testModel(modelValue);
    },
    [setProvider, setModelForProvider, textareaRef, testModel],
  );

  const handleCustomModelSubmit = useCallback(() => {
    const trimmed = customModel.trim();
    if (!trimmed) return;
    handleModelSelect(provider, trimmed);
  }, [customModel, provider, handleModelSelect]);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            title="Change model"
          >
            <SessionProviderLogo provider={provider} className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[80px] truncate">{currentModelLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0" />
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-md overflow-hidden p-0">
          <DialogTitle>Model Selector</DialogTitle>
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList className="max-h-[350px]">
              <CommandEmpty>No models found.</CommandEmpty>
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
                <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
                  <SessionProviderLogo provider={provider} className="h-3.5 w-3.5 shrink-0" />
                  {getProviderDisplayName(provider)}
                </span>
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Custom model..."
                  className="h-7 text-xs"
                />
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model test toast */}
      {toast && (
        <div
          className={
            toast.type === 'success'
              ? 'animate-in slide-in-from-bottom-2 fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg'
              : toast.type === 'not_configured'
                ? 'animate-in slide-in-from-bottom-2 fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white shadow-lg'
                : 'animate-in slide-in-from-bottom-2 fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white shadow-lg'
          }
        >
          {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </>
  );
}
