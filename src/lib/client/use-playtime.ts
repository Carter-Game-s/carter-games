"use client";
import { useEffect, useRef } from "react";
import { activeDelta, beginGame, recordTime } from "./gaming";
export function usePlaytime(
  slug: string,
  status: string,
  external: boolean,
  sessionId: string,
) {
  const statusRef = useRef(status);
  const clockChange = useRef<(() => void) | null>(null);
  useEffect(() => {
    const session = sessionId;
    let last = performance.now(),
      input = last,
      pending = 0,
      total = 0,
      started = false;
    const activity = () => {
      input = performance.now();
    };
    const flush = () => {
      if (pending) {
        recordTime(slug, pending, total);
        pending = 0;
      }
    };
    const tick = () => {
      const now = performance.now();
      const playing = statusRef.current === "playing";
      if (playing && !started) {
        started = true;
        beginGame(slug, session);
      }
      const delta = activeDelta(
        last,
        now,
        document.visibilityState === "visible" && document.hasFocus(),
        playing,
        input,
      );
      last = now;
      pending += delta;
      total += delta;
      if (pending >= 10000) flush();
    };
    clockChange.current = tick;
    const visibility = () => {
      tick();
      flush();
    };
    const timer = setInterval(tick, 1000);
    const node = document.querySelector(".game-stage");
    for (const event of ["pointerdown", "keydown", "pointermove"])
      node?.addEventListener(event, activity, { passive: true });
    const message = (event: MessageEvent) => {
      const frame = node?.querySelector("iframe");
      if (
        external &&
        event.source === frame?.contentWindow &&
        event.origin === "null" &&
        event.data?.type === "orbit-game-active"
      )
        activity();
    };
    window.addEventListener("message", message);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", visibility);
    return () => {
      tick();
      flush();
      clockChange.current = null;
      clearInterval(timer);
      for (const event of ["pointerdown", "keydown", "pointermove"])
        node?.removeEventListener(event, activity);
      window.removeEventListener("message", message);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", visibility);
    };
  }, [slug, external, sessionId]);
  useEffect(() => {
    clockChange.current?.();
    statusRef.current = status;
  }, [status]);
}
