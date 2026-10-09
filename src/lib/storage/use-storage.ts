"use client";
import { useEffect, useState } from "react";
import { read, write } from "./index";
export function useStorage<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const update = () => setValue(read(key, fallback));
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
      setValue(v);
      write(key, v);
    },
  ];
}
