import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseCustomContextMenuOptions {
  enabled?: boolean;
  onPaste?: (text: string) => void;
}

interface UseCustomContextMenuReturn {
  contextMenuPosition: Position | null;
  showContextMenu: (e: React.MouseEvent) => void;
  hideContextMenu: () => void;
  handlePaste: () => Promise<void>;
  feedbackMessage: string | null;
  feedbackType: 'success' | 'error' | null;
}

export function useCustomContextMenu(
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>,
  options: UseCustomContextMenuOptions = {}
): UseCustomContextMenuReturn {
  const { enabled = true, onPaste } = options;

  const [contextMenuPosition, setContextMenuPosition] = useState<Position | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);

  const hideTimeoutRef = useRef<number>();

  const showFeedback = useCallback((message: string, type: 'success' | 'error') => {
    setFeedbackMessage(message);
    setFeedbackType(type);

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
      setFeedbackType(null);
    }, 2000);
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  const showContextMenu = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 120);

    setContextMenuPosition({ x, y });
  }, [enabled]);

  const handlePaste = useCallback(async () => {
    hideContextMenu();

    const target = targetRef.current;
    if (!target) {
      showFeedback('无法获取元素', 'error');
      return;
    }

    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
          const clipboardData = window.clipboardData;
          if (clipboardData?.getData) {
            const text = clipboardData.getData('Text');
            if (text) {
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const value = target.value;
              const newValue = value.substring(0, start) + text + value.substring(end);
              target.value = newValue;
              target.selectionStart = target.selectionEnd = start + text.length;
              target.dispatchEvent(new Event('input', { bubbles: true }));
              showFeedback('粘贴成功', 'success');
              onPaste?.(text);
              return;
            }
          }
        }
        showFeedback('浏览器不支持剪贴板API', 'error');
        return;
      }

      const text = await navigator.clipboard.readText();

      if (!text || text.trim() === '') {
        showFeedback('剪贴板为空', 'error');
        return;
      }

      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const value = target.value;
        const newValue = value.substring(0, start) + text + value.substring(end);
        target.value = newValue;
        target.selectionStart = target.selectionEnd = start + text.length;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target instanceof HTMLElement) {
        const existingContent = target.innerText || '';
        target.innerText = existingContent + (existingContent ? '\n' : '') + text;
      }

      showFeedback('粘贴成功', 'success');
      onPaste?.(text);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        showFeedback('剪贴板权限被拒绝，请授权后重试', 'error');
      } else if (error.name === 'NotFoundError') {
        showFeedback('剪贴板为空', 'error');
      } else {
        showFeedback('粘贴失败: ' + error.message, 'error');
      }
    }
  }, [targetRef, hideContextMenu, showFeedback, onPaste]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuPosition) {
        const target = e.target as HTMLElement;
        if (!target.closest('.custom-context-menu')) {
          hideContextMenu();
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenuPosition) {
        hideContextMenu();
      }
    };

    if (contextMenuPosition) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuPosition, hideContextMenu]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return {
    contextMenuPosition,
    showContextMenu,
    hideContextMenu,
    handlePaste,
    feedbackMessage,
    feedbackType,
  };
}

interface ContextMenuProps {
  position: Position;
  onPaste: () => void;
  onClose: () => void;
}

export function CustomContextMenu({ position, onPaste, onClose }: ContextMenuProps) {
  return (
    <div
      className="custom-context-menu fixed z-50 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={onPaste}
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-neutral-700 flex items-center gap-2 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        粘贴
      </button>
      <button
        onClick={onClose}
        className="w-full px-4 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-700 flex items-center gap-2 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        关闭
      </button>
    </div>
  );
}

interface FeedbackToastProps {
  message: string | null;
  type: 'success' | 'error' | null;
}

export function FeedbackToast({ message, type }: FeedbackToastProps) {
  if (!message || !type) return null;

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const icon = type === 'success' ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 z-50`}>
      {icon}
      {message}
    </div>
  );
}
