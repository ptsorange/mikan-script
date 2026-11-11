import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="ms-footer">
      <div className="ms-footer-inner">
        <p className="ms-footer-copy">© Mikan Script</p>
        <nav className="ms-footer-nav" aria-label="フッターメニュー">
          <Link href="/">作品一覧</Link>
          <Link href="/make">エディタ</Link>
          <a href="https://github.com/ptsorange/mikan-script" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
