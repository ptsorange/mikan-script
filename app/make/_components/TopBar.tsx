"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";
import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  onExport: () => void;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
};

// 上のバー: ホームへ戻る・書き出し・読み込み・言語切り替え
export default function TopBar({ onExport, onImport }: Props) {
  const { t, toggleLocale } = useLocale();

  return (
    <header className="kc-top">
      <Link href="/" className="kc-btn" title={t.editor.top.homeTitle}>
        {t.editor.top.home}
      </Link>
      <div className="kc-title">{t.editor.top.title}</div>
      <span className="kc-hint">{t.editor.top.shortcutHint}</span>
      <button
        type="button"
        className="kc-btn"
        onClick={toggleLocale}
        aria-label={t.switchToAria}
        title={t.switchToAria}
      >
        🌐 {t.switchToLabel}
      </button>
      <button className="kc-btn" onClick={onExport}>
        {t.editor.top.exportBtn}
      </button>
      <label className="kc-btn">
        {t.editor.top.importBtn}
        <input className="kc-sr" type="file" accept=".mks" onChange={onImport} />
      </label>
    </header>
  );
}
