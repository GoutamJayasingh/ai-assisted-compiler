import { createContext, useContext, useState, type ReactNode } from "react";

interface DemoState {
  open: boolean;
  step: number;
  focus: string | null; // e.g. "repair:classes" — pages may pre-select a tab
  start: () => void;
  close: () => void;
  setStep: (n: number) => void;
  setFocus: (f: string | null) => void;
}

const Ctx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <Ctx.Provider
      value={{
        open,
        step,
        focus,
        start: () => {
          setStep(0);
          setOpen(true);
        },
        close: () => {
          setOpen(false);
          setFocus(null);
        },
        setStep,
        setFocus,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDemo(): DemoState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo outside DemoProvider");
  return v;
}

/** Returns the tab requested by the guided demo for `page`, if any. */
export function useDemoFocus(page: string): string | null {
  const { focus } = useDemo();
  if (!focus) return null;
  const [p, tab] = focus.split(":");
  return p === page ? tab ?? null : null;
}
