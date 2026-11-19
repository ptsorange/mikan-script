"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

export default function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="ms-footer">
      <div className="ms-footer-inner">
        <p className="ms-footer-copy">© Mikan Script</p>
        <nav className="ms-footer-nav" aria-label={t.footer.navAria}>
          <Link href="/">{t.footer.projects}</Link>
          <Link href="/make">{t.footer.editor}</Link>
          <a href="https://github.com/ptsorange/mikan-script" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
