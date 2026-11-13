"use client";

import type { ChangeEvent } from "react";
import Link from "next/link";

type Props = {
  onExport: () => void;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
};

// 上のバー: ホームへ戻る・書き出し・読み込み
export default function TopBar({ onExport, onImport }: Props) {
  return (
    <header className="kc-top">
      <Link href="/" className="kc-btn" title="作品一覧">
        🍊 ホーム
      </Link>
      <div className="kc-title">main.code — コードでゲームをつくろう</div>
      <span className="kc-hint">Ctrl + Enter(Macは ⌘ + Enter)でも実行できるよ</span>
      <button className="kc-btn" onClick={onExport}>💾 書き出し</button>
      <label className="kc-btn">
        📂 読み込み
        <input className="kc-sr" type="file" accept=".mks" onChange={onImport} />
      </label>
    </header>
  );
}
