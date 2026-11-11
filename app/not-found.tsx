import Link from "next/link";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";

export default function NotFound() {
  return (
    <div className="ms-app">
      <SiteHeader />

      <main className="ms-main ms-center">
        <p className="ms-404">404</p>
        <h1>ページが見つかりません</h1>
        <p className="ms-muted">URL が間違っているか、作品が削除された可能性があります。</p>
        <div className="ms-row">
          <Link href="/" className="ms-btn ms-btn-green">
            作品一覧へ
          </Link>
          <Link href="/make" className="ms-btn ms-btn-purple">
            ✎ エディタ
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
