type Props = {
  testMode: boolean;
  onSelectPlacement: () => void;
  onSelectTest: () => void;
};

/** 「配置」(ドラッグで動かす)と「テスト」(押して試す)の切りかえ */
export default function ModeSwitch({ testMode, onSelectPlacement, onSelectTest }: Props) {
  return (
    <div
      className="kc-touch-preview-mode"
      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "8px 0" }}
    >
      <span style={{ fontSize: 12, opacity: 0.8, marginRight: 2 }}>プレビュー操作</span>
      <button
        type="button"
        className={`kc-btn ${!testMode ? "kc-run" : "kc-btn-muted"}`}
        aria-pressed={!testMode}
        onClick={onSelectPlacement}
        style={{ padding: "6px 10px", fontSize: 12 }}
      >
        配置
      </button>
      <button
        type="button"
        className={`kc-btn ${testMode ? "kc-run" : "kc-btn-muted"}`}
        aria-pressed={testMode}
        onClick={onSelectTest}
        style={{ padding: "6px 10px", fontSize: 12 }}
      >
        テスト
      </button>
      <span style={{ fontSize: 11, opacity: 0.75 }}>
        {testMode ? "押している間だけ入力されます" : "ボタンをドラッグして位置を調整します"}
      </span>
    </div>
  );
}
