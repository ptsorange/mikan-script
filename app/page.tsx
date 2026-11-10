import Link from "next/link";
import { listProjects } from "@/lib/projects";

export default async function Home() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">🍊 Mikan Script</h1>
          <p className="mt-1 text-sm opacity-70">
            コードでゲームをつくろう。みんなの作品で遊んだり、改造したりできるよ。
          </p>
        </div>
        <Link
          href="/make"
          className="rounded-full bg-orange-500 px-6 py-2.5 font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.28)] hover:bg-orange-400"
        >
          ✎ 自分でつくる
        </Link>
      </header>

      {projects.length === 0 ? (
        <p className="opacity-70">
          まだ作品がないよ。<code>public/projects/</code> に <code>.mks</code> を置くと、ここに並ぶよ。
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/15 dark:bg-white/[0.06]"
            >
              <div className="flex-1">
                <h2 className="text-lg font-bold break-words">{p.title}</h2>
                {p.author && <p className="text-xs opacity-60">作った人: {p.author}</p>}
                {p.description && <p className="mt-2 text-sm opacity-80 break-words">{p.description}</p>}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/play/${encodeURIComponent(p.id)}`}
                  className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-green-500"
                >
                  ▶ あそぶ
                </Link>
                <Link
                  href={`/make?load=${encodeURIComponent(p.id)}`}
                  className="rounded-full bg-purple-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-purple-500"
                >
                  ✎ 改造する
                </Link>
                <a
                  href={`/projects/${encodeURIComponent(p.id)}.mks`}
                  download
                  className="ml-auto self-center text-xs underline opacity-60 hover:opacity-100"
                >
                  .mks
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
