import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type TableHotkeys = {
  onSave?: () => void;
  onFocusFilter?: () => void;
  onPasteText?: (text: string) => void;
};

type HotkeysState = {
  setActiveTableHotkeys: (next: TableHotkeys | null) => void;
};

const HotkeysCtx = createContext<HotkeysState | null>(null);

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

export function HotkeysProvider({ children }: { children: ReactNode }) {
  const [activeTableHotkeys, setActiveTableHotkeys] = useState<TableHotkeys | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey) return;
      if (e.key.toLowerCase() === "s" && activeTableHotkeys?.onSave) {
        e.preventDefault();
        activeTableHotkeys.onSave();
        return;
      }
      if (e.key.toLowerCase() === "f" && activeTableHotkeys?.onFocusFilter && !isTypingTarget(e.target)) {
        e.preventDefault();
        activeTableHotkeys.onFocusFilter();
      }
    }
    function onPaste(e: ClipboardEvent) {
      if (!activeTableHotkeys?.onPasteText) return;
      if (isTypingTarget(e.target)) return;
      const text = e.clipboardData?.getData("text/plain") || "";
      if (!text.trim()) return;
      e.preventDefault();
      activeTableHotkeys.onPasteText(text);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [activeTableHotkeys]);

  const value = useMemo(() => ({ setActiveTableHotkeys }), []);
  return <HotkeysCtx.Provider value={value}>{children}</HotkeysCtx.Provider>;
}

export function useHotkeys() {
  const ctx = useContext(HotkeysCtx);
  if (!ctx) {
    throw new Error("useHotkeys must be used under HotkeysProvider");
  }
  return ctx;
}
