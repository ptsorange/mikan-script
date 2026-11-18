import { useEffect, useRef, useState } from "react";
import { resolveTouchControlsState, type TouchArea, type TouchControlsConfig } from "@/lib/touchControls";
import { enabledStorageKey, storageKey } from "./storage";

type Params = { projectId: string; defaultTouchControls?: TouchControlsConfig };

/** 作品ごとの、タッチボタンの配置と「有効/無効」。このブラウザに保存し、保存がなければ作品のデフォルトを使う */
export function useStoredSettings({ projectId, defaultTouchControls }: Params) {
  const [areas, setAreas] = useState<TouchArea[]>([]);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [hasCustomSettings, setHasCustomSettings] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const areasDirtyRef = useRef(false);
  const prevProjectIdRef = useRef<string | null>(null);

  // プロジェクトごとに、このブラウザへ設定を保存する。保存値がなければ作品のデフォルト設定を使う。
  useEffect(() => {
    const projectChanged = prevProjectIdRef.current !== projectId;
    prevProjectIdRef.current = projectId;
    setLoadedFor(null);

    let storedAreasRaw: string | null = null;
    let storedEnabledRaw: string | null = null;
    try {
      storedAreasRaw = localStorage.getItem(storageKey(projectId));
      storedEnabledRaw = localStorage.getItem(enabledStorageKey(projectId));
    } catch {
      storedAreasRaw = null;
      storedEnabledRaw = null;
    }

    const resolved = resolveTouchControlsState({
      storedAreasRaw,
      storedEnabledRaw,
      defaultConfig: defaultTouchControls,
    });

    if (projectChanged) {
      areasDirtyRef.current = resolved.hasCustomAreas;
      setAreas(resolved.areas);
      setTouchEnabled(resolved.enabled);
      setHasCustomSettings(resolved.hasCustomAreas || resolved.hasCustomEnabled);
      setSelectedId(null);
    } else {
      if (storedAreasRaw === null && !areasDirtyRef.current) {
        setAreas(resolved.areas);
      }
      if (storedEnabledRaw === null) {
        setTouchEnabled(resolved.enabled);
      }
    }
    setLoadedFor(projectId);
  }, [projectId, defaultTouchControls]);

  useEffect(() => {
    // 別プロジェクトの古い state や未変更のデフォルト値を、カスタム設定として保存しない。
    if (loadedFor !== projectId || !areasDirtyRef.current) return;
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(areas));
    } catch {
      // ストレージが使えない環境でもゲーム自体は操作できる。
    }
  }, [areas, loadedFor, projectId]);

  useEffect(() => {
    if (areas.length === 0) setSelectedId(null);
    else if (!areas.some((area) => area.id === selectedId)) setSelectedId(areas[0].id);
  }, [areas, selectedId]);

  const selected = areas.find((area) => area.id === selectedId) ?? null;

  const markAreasDirty = () => {
    areasDirtyRef.current = true;
    setHasCustomSettings(true);
  };

  return {
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
  };
}
