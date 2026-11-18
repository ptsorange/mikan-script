import type { RefObject } from "react";
import type { GameFrameHandle } from "@/app/_components/GameFrame";
import type { TouchArea, TouchControlsConfig } from "@/lib/touchControls";

export type HeldAction = { token: string; kind: TouchArea["kind"]; value: string };
export type PointerState = { tokens: Set<string> };

export type Props = {
  projectId: string;
  started: boolean;
  layoutKey: string;
  defaultTouchControls?: TouchControlsConfig;
  stageRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<GameFrameHandle | null>;
  /** 設定パネルを出す場所(ゲーム画面の外)。なければ画面の上に重ねて出す */
  panelHost?: HTMLElement | null;
  /** 「タッチ操作設定」ボタンを置く場所(スタート・音量ボタンの並び)。なければ画面の右下に重ねて出す */
  toggleHost?: HTMLElement | null;
  /** いま全画面か(全画面の中にはパネルを出せないので、開くときに全画面を終える) */
  isFullscreen?: boolean;
  onExitFullscreen?: () => void;
};
