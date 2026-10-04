// A fading UI layer. Hidden layers are `inert` so keyboard focus can never land in them.
import { useEffect, useRef, type ReactNode } from "react";
import { isTouch } from "../state/store";

interface Props {
  on: boolean;
  id?: string;
  className?: string;
  label?: string;
  role?: string;
  /** focus the first visible button when the layer appears (keyboard users) */
  focus?: boolean;
  children?: ReactNode;
}

export function Layer({ on, id, className = "", label, role, focus, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.toggleAttribute("inert", !on);
    if (on && focus && !isTouch) {
      const timer = setTimeout(() => el.querySelector<HTMLButtonElement>("button:not([hidden])")?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(timer);
    }
  }, [on, focus]);
  return (
    <div ref={ref} id={id} className={`layer ${className}${on ? " on" : ""}`} aria-label={label} role={role}>
      {children}
    </div>
  );
}
