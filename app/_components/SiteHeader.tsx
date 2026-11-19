"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

// ホーム・プレイ・404 で使う、一般的なサイトヘッダー(エディタは専用の上バーを使う)
export default function SiteHeader() {
  const { t, toggleLocale } = useLocale();

  return (
    <header className="ms-header">
      <div className="ms-header-inner">
        <Link href="/" className="ms-brand">
          <span aria-hidden="true">🍊</span>
          Mikan Script
        </Link>
        <nav className="ms-nav" aria-label={t.header.navAria}>
          <Link href="/" className="ms-nav-link">
            {t.header.projects}
          </Link>
          <button
            type="button"
            className="ms-lang-btn"
            onClick={toggleLocale}
            aria-label={t.switchToAria}
            title={t.switchToAria}
          >
            🌐 {t.switchToLabel}
          </button>
          <Link href="/make" className="ms-btn ms-btn-purple">
            {t.header.editor}
          </Link>
        </nav>
      </div>
    </header>
  );
}
