"use client";
import { useEffect, useRef, useState } from "react";
import {
  agreementKey,
  agreementVersion,
  playerRules,
} from "@/lib/player-chat/rules";
import { defaultPreferences, validPreferences } from "@/lib/client/preferences";
import { useStorage } from "@/lib/storage/use-storage";
import styles from "./player.module.css";

const keys = {
  "double-escape": ["Esc", "Esc"],
  "ctrl-shift-h": ["Ctrl", "Shift", "H"],
  "alt-q": ["Alt", "Q"],
};

export function RulesDialog({
  accept,
  close,
}: {
  accept?: () => void;
  close?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [preferences] = useStorage(
    "preferences",
    defaultPreferences,
    validPreferences,
  );
  const shortcut = keys[preferences.quickHide.shortcut];
  useEffect(() => {
    const current = dialog.current;
    current?.showModal();
    return () => current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="agreement-title"
      className={styles.rules}
      onCancel={(event) => {
        event.preventDefault();
        close?.();
      }}
    >
      <h2 id="agreement-title" tabIndex={-1} autoFocus>
        {accept ? "Before you continue" : "Player rules"}
      </h2>
      <div className={styles.ruleBody}>
        <p>Welcome to GetMoreMath2.0.</p>
        <p>
          This website is shared with other players. What you do here can affect
          everyone else who uses it.
        </p>
        <p>
          <strong>
            IMPORTANT: If the website gets blocked because of misuse, EVERYONE
            could lose access, not just you.
          </strong>
        </p>
        <p>Please read and agree to the following rules.</p>
        <h3>Player rules</h3>
        <ol>
          {playerRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <h3>Quick-exit reminder</h3>
        {shortcut ? (
          <>
            <p>
              {shortcut.map((key, i) => (
                <span key={i}>
                  {i > 0 && (shortcut[0] === "Esc" ? " then " : " + ")}
                  <kbd>{key}</kbd>
                </span>
              ))}
            </p>
            <p>
              When Quick Hide is enabled, this shortcut immediately navigates
              away from the current page. Quick Hide is currently{" "}
              {preferences.quickHide.enabled ? "enabled" : "disabled"}.
            </p>
          </>
        ) : (
          <p>Shortcut unavailable</p>
        )}
      </div>
      <div className={styles.actions}>
        {accept ? (
          <>
            <button className="primary" onClick={accept}>
              I Understand &amp; Agree
            </button>
            <button
              onClick={() =>
                window.location.replace("https://www.wikipedia.org/")
              }
            >
              Leave Website
            </button>
          </>
        ) : (
          <button onClick={close}>Close rules</button>
        )}
      </div>
    </dialog>
  );
}

export function ReviewRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Review player rules</button>
      {open && <RulesDialog close={() => setOpen(false)} />}
    </>
  );
}

export function getAgreement() {
  try {
    return localStorage.getItem(agreementKey) === agreementVersion;
  } catch {
    return false;
  }
}

export function saveAgreement() {
  try {
    localStorage.setItem(agreementKey, agreementVersion);
  } catch {}
}
