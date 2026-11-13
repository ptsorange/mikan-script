import Link from "next/link";
import { listProjects } from "@/lib/projects";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="ms-app">
      <SiteHeader />

      <main className="ms-main">
        <section className="ms-hero">
          <h1>作品一覧</h1>
          <p>公開されているゲームを遊んだり、エディタで改造したりできます。</p>
        </section>

        {projects.length === 0 ? (
          <p className="ms-empty">
            作品がありません。<code>public/projects/</code> に <code>.mks</code> ファイルを置くと、ここに表示されます。
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
                    <Link href={playHref} className="ms-play-btn" aria-label={`${p.title} を遊ぶ`}>
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

      <SiteFooter />
    </div>
  );
}
