"use client";
import type { NativeGameProps } from "../types";
import { Arcade } from "../shared/arcade";
export default function Game(props: NativeGameProps) {
  return <Arcade {...props} kind="flappy" />;
}
