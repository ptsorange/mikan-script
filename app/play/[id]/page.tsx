import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listProjects } from "@/lib/projects";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import Player from "./Player";

export async function generateStaticParams() {
  // public/projects/ の作品すべて。1 件以上ないとビルドがエラーになるため、sample.mks は削除しないこと
  return (await listProjects()).map((p) => ({ id: p.id }));
}

const find = async (rawId: string) => {
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    /* そのまま使う */
  }
  return (await listProjects()).find((p) => p.id === id);
};

export async function generateMetadata({ params }: PageProps<"/play/[id]">): Promise<Metadata> {
  const project = await find((await params).id);
  return { title: project ? `${project.title} — Mikan Script` : "Mikan Script" };
}

export default async function PlayPage({ params }: PageProps<"/play/[id]">) {
  const project = await find((await params).id);
  if (!project) notFound();

  return (
    <div className="ms-app">
      <SiteHeader />
      <Player project={project} />
      <SiteFooter />
    </div>
  );
}
