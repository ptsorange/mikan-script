import Link from "next/link";

// ホーム・プレイ・404 で使う、一般的なサイトヘッダー(エディタは専用の上バーを使う)
export default function SiteHeader() {
  return (
    <header className="ms-header">
      <div className="ms-header-inner">
        <Link href="/" className="ms-brand">
          <span aria-hidden="true">🍊</span>
          Mikan Script
        </Link>
        <nav className="ms-nav" aria-label="メインメニュー">
          <Link href="/" className="ms-nav-link">
            作品一覧
          </Link>
          <Link href="/make" className="ms-btn ms-btn-purple">
            ✎ エディタ
          </Link>
        </nav>
      </div>
    </header>
  );
}
