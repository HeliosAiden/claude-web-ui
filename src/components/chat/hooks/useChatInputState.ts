import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChangeEvent,
  FormEvent,
  MouseEvent,
} from 'react';

import { safeLocalStorage } from '../utils/chatStorage';
import type { Project } from '../../../types/app';

interface UseChatInputStateArgs {
  selectedProject: Project | null;
  onInputFocusChange?: (focused: boolean) => void;
  /** Injected by the orchestrator so the input hook can sync cursor for file mentions */
  setCursorPosition?: (pos: number) => void;
  /** Injected by the orchestrator so the input hook can delegate to slash-command filtering */
  handleCommandInputChange?: (value: string, cursorPos: number) => void;
  /** Injected by the orchestrator so the input hook can close the command menu on clear */
  resetCommandMenuState?: () => void;
}

export function useChatInputState({
  selectedProject,
  onInputFocusChange,
  setCursorPosition,
  handleCommandInputChange,
  resetCommandMenuState,
}: UseChatInputStateArgs) {
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      return safeLocalStorage.getItem(`draft_input_${selectedProject.projectId}`) || '';
    }
    return '';
  });
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputHighlightRef = useRef<HTMLDivElement>(null);
  const inputValueRef = useRef(input);

  // Keep the ref in sync so handleSubmit (in the orchestrator) can read
  // the latest value without adding `input` to its dependency array.
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  // Restore draft on project change
  useEffect(() => {
    if (!selectedProject) return;
    const savedInput = safeLocalStorage.getItem(`draft_input_${selectedProject.projectId}`) || '';
    setInput((previous) => {
      const next = previous === savedInput ? previous : savedInput;
      inputValueRef.current = next;
      return next;
    });
  }, [selectedProject?.projectId]);

  // Persist draft
  useEffect(() => {
    if (!selectedProject) return;
    if (input !== '') {
      safeLocalStorage.setItem(`draft_input_${selectedProject.projectId}`, input);
    } else {
      safeLocalStorage.removeItem(`draft_input_${selectedProject.projectId}`);
    }
  }, [input, selectedProject]);

  // Auto-resize textarea on input changes
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.max(22, textareaRef.current.scrollHeight)}px`;
    const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);
    const expanded = textareaRef.current.scrollHeight > lineHeight * 2;
    setIsTextareaExpanded(expanded);
  }, [input]);

  // Collapse textarea when empty
  useEffect(() => {
    if (!textareaRef.current || input.trim()) return;
    textareaRef.current.style.height = 'auto';
    setIsTextareaExpanded(false);
  }, [input]);

  const syncInputOverlayScroll = useCallback((target: HTMLTextAreaElement) => {
    if (!inputHighlightRef.current || !target) return;
    inputHighlightRef.current.scrollTop = target.scrollTop;
    inputHighlightRef.current.scrollLeft = target.scrollLeft;
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      const cursorPos = event.target.selectionStart;

      setInput(newValue);
      inputValueRef.current = newValue;
      setCursorPosition?.(cursorPos);

      if (!newValue.trim()) {
        event.target.style.height = 'auto';
        setIsTextareaExpanded(false);
        resetCommandMenuState?.();
        return;
      }

      handleCommandInputChange?.(newValue, cursorPos);
    },
    [handleCommandInputChange, resetCommandMenuState, setCursorPosition],
  );

  const handleTextareaClick = useCallback(
    (event: MouseEvent<HTMLTextAreaElement>) => {
      setCursorPosition?.(event.currentTarget.selectionStart);
    },
    [setCursorPosition],
  );

  const handleTextareaInput = useCallback(
    (event: FormEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      target.style.height = 'auto';
      target.style.height = `${Math.max(22, target.scrollHeight)}px`;
      setCursorPosition?.(target.selectionStart);
      syncInputOverlayScroll(target);

      const lineHeight = parseInt(window.getComputedStyle(target).lineHeight);
      setIsTextareaExpanded(target.scrollHeight > lineHeight * 2);
    },
    [setCursorPosition, syncInputOverlayScroll],
  );

  const handleClearInput = useCallback(() => {
    setInput('');
    inputValueRef.current = '';
    resetCommandMenuState?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    setIsTextareaExpanded(false);
  }, [resetCommandMenuState]);

  const handleInsertTemplate = useCallback(
    (content: string) => {
      setInput(content);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [textareaRef],
  );

  const handleInputFocusChange = useCallback(
    (focused: boolean) => {
      setIsInputFocused(focused);
      onInputFocusChange?.(focused);
    },
    [onInputFocusChange],
  );

  return {
    input,
    setInput,
    textareaRef,
    inputHighlightRef,
    isTextareaExpanded,
    setIsTextareaExpanded,
    isInputFocused,
    inputValueRef,
    handleInputChange,
    handleTextareaClick,
    handleTextareaInput,
    handleInputFocusChange,
    syncInputOverlayScroll,
    handleClearInput,
    handleInsertTemplate,
  };
}
