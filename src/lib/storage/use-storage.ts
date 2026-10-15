"use client";
import { useEffect, useState } from "react";
import { read, write, PREFIX } from "./index";
export function useStorage<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): [T, (value: T) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const update = (event?: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === "string" &&
        event.detail !== key
      )
        return;
      if (
        event instanceof StorageEvent &&
        event.key &&
        event.key !== PREFIX + key
      )
        return;
      const stored = read(key, fallback);
      setValue(validate && !validate(stored) ? fallback : stored);
    };
    update();
    window.addEventListener("storage", update);
    window.addEventListener("orbit-storage", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("orbit-storage", update);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [
    value,
    (v: T) => {
      if (write(key, v)) setValue(v);
    },
  ];
}
