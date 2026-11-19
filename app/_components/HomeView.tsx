"use client";

import Link from "next/link";
import type { ProjectInfo } from "@/lib/projects";
import { useLocale } from "./LocaleProvider";

export default function HomeView({ projects }: { projects: ProjectInfo[] }) {
  const { t } = useLocale();

  return (
    <main className="ms-main">
      <section className="ms-hero">
        <h1>{t.home.title}</h1>
        <p>{t.home.subtitle}</p>
      </section>

      {projects.length === 0 ? (
        <p className="ms-empty">
          {t.home.emptyBefore}
          <code>public/projects/</code>
          {t.home.emptyMiddle}
          <code>.mks</code>
          {t.home.emptyAfter}
        </p>
      ) : (
        <ul className="ms-grid">
          {projects.map((p) => {
            const id = encodeURIComponent(p.id);
            const playHref = `/play/${id}`;
            return (
              <li key={p.id} className="ms-card">
                <Link href={playHref} className="ms-thumb" tabIndex={-1} aria-hidden="true">
                  {p.hasThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/thumbnails/${id}`} alt="" loading="lazy" />
                  ) : (
                    <span className="ms-thumb-empty">🍊</span>
                  )}
                </Link>

                <div className="ms-card-row">
                  <Link href={playHref} className="ms-play-btn" aria-label={t.home.playAria(p.title)}>
                    ▶
                  </Link>
                  <div className="ms-card-text">
                    <h2 className="ms-card-title ms-ellipsis" title={p.title}>
                      <Link href={playHref}>{p.title}</Link>
                    </h2>
                    <p className="ms-card-desc ms-clamp" title={p.description || undefined}>
                      {p.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
