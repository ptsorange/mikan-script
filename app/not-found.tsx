"use client";

import Link from "next/link";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import { useLocale } from "@/app/_components/LocaleProvider";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="ms-app">
      <SiteHeader />

      <main className="ms-main ms-center">
        <p className="ms-404">404</p>
        <h1>{t.notFound.title}</h1>
        <p className="ms-muted">{t.notFound.desc}</p>
        <div className="ms-row">
          <Link href="/" className="ms-btn ms-btn-green">
            {t.notFound.backHome}
          </Link>
          <Link href="/make" className="ms-btn ms-btn-purple">
            {t.notFound.editor}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
