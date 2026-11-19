"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { hasTouchControlsConfig, sanitizeAreas } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import Panel from "./Panel";
import TouchLayer from "./TouchLayer";
import { enabledStorageKey, storageKey } from "./storage";
import type { Props } from "./types";
import { useAreaOps } from "./useAreaOps";
import { useHeldInput } from "./useHeldInput";
import { useOverlayViewport } from "./useOverlayViewport";
import { usePointerHandlers } from "./usePointerHandlers";
import { usePresets } from "./usePresets";
import { useStoredSettings } from "./useStoredSettings";

/* あそぶページの、タッチ操作。ゲーム画面の上にタッチボタンを重ね、押した状態をゲームに送る。
   「タッチ操作設定」のパネルで、ボタンの配置や共通設定を編集できる。 */
export default function TouchControls({
  projectId,
  started,
  layoutKey,
  defaultTouchControls,
  stageRef,
  frameRef,
  panelHost,
  toggleHost,
  isFullscreen = false,
  onExitFullscreen,
}: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const {
    areas,
    setAreas,
    touchEnabled,
    setTouchEnabled,
    hasCustomSettings,
    setHasCustomSettings,
    selectedId,
    setSelectedId,
    selected,
    areasDirtyRef,
    markAreasDirty,
  } = useStoredSettings({ projectId, defaultTouchControls });
  const viewport = useOverlayViewport({ stageRef, frameRef, layoutKey });
  const { heldPointers, releaseAction, releaseAll, syncPointer } = useHeldInput({ frameRef, areas, started, editing, touchEnabled });
  const ops = useAreaOps({
    areas,
    setAreas,
    selected,
    selectedId,
    setSelectedId,
    markAreasDirty,
    releaseAll,
    setOpen,
    setEditing,
  });
  const presetState = usePresets({ areas, applyAreas: ops.applyAreas });
  const pointer = usePointerHandlers({
    editing,
    started,
    touchEnabled,
    heldPointers,
    syncPointer,
    releaseAction,
    setSelectedId,
    updateArea: ops.updateArea,
  });

  const changeTouchEnabled = (enabled: boolean) => {
    if (!enabled) releaseAll();
    setTouchEnabled(enabled);
    setHasCustomSettings(true);
    try {
      localStorage.setItem(enabledStorageKey(projectId), String(enabled));
    } catch {
      // 保存できなくても現在の画面では切り替えを反映する。
    }
  };

  const resetToProjectDefault = () => {
    if (!defaultTouchControls) return;
    releaseAll();
    pointer.cancelDrag();
    areasDirtyRef.current = false;
    try {
      localStorage.removeItem(storageKey(projectId));
      localStorage.removeItem(enabledStorageKey(projectId));
    } catch {
      // ignore
    }
    const nextAreas = sanitizeAreas(defaultTouchControls.areas);
    setAreas(nextAreas);
    setTouchEnabled(defaultTouchControls.enabled);
    setSelectedId(nextAreas[0]?.id ?? null);
    setHasCustomSettings(false);
  };

  const removeSelected = () => {
    if (!selected) return;
    releaseAll();
    pointer.cancelDrag();
    markAreasDirty();
    setAreas((current) => current.filter((area) => area.id !== selected.id));
  };

  const togglePanel = () => {
    if (!open) {
      if (isFullscreen) onExitFullscreen?.(); // パネルはゲーム画面の外に出るので、全画面は終える
      releaseAll();
      setEditing(true);
    } else {
      setEditing(false);
    }
    setOpen((value) => !value);
  };

  const layerStyle = {
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
    height: viewport.height,
  };

  const hasProjectDefault = hasTouchControlsConfig(defaultTouchControls);

  const panelNode = (
    <Panel
      touchEnabled={touchEnabled}
      changeTouchEnabled={changeTouchEnabled}
      areas={areas}
      selected={selected}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      clipboardArea={ops.clipboardArea}
      open={open}
      editing={editing}
      setEditing={setEditing}
      hasProjectDefault={hasProjectDefault}
      hasCustomSettings={hasCustomSettings}
      addArea={ops.addArea}
      copySelected={ops.copySelected}
      pasteArea={ops.pasteArea}
      removeSelected={removeSelected}
      togglePanel={togglePanel}
      resetToProjectDefault={resetToProjectDefault}
      releaseAll={releaseAll}
      presetState={presetState}
      sizeDrafts={ops.sizeDrafts}
      setSizeDrafts={ops.setSizeDrafts}
      updateSelected={ops.updateSelected}
      commitSize={ops.commitSize}
    />
  );

  return (
    <>
      {((started && touchEnabled) || (open && editing)) && areas.length > 0 && viewport.width > 0 && (
        <TouchLayer layerStyle={layerStyle} areas={areas} editing={editing} pointer={pointer} />
      )}
      {toggleHost
        ? createPortal(
            <button
              type="button"
              className={`ms-btn ms-touch-toggle is-inline${open ? " is-open" : ""}`}
              aria-expanded={open}
              onClick={(event) => {
                togglePanel();
                event.currentTarget.blur();
              }}
            >
              {t.touch.toggleButton}
            </button>,
            toggleHost,
          )
        : !open && (
            <div className="ms-touch-controls">
              <button type="button" className="ms-touch-toggle" aria-expanded={open} onClick={togglePanel}>
                {t.touch.toggleButton}
              </button>
            </div>
          )}
      {open && (panelHost ? createPortal(panelNode, panelHost) : panelNode)}
    </>
  );
}
