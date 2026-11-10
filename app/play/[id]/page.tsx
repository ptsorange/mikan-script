import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listProjects } from "@/lib/projects";
import Player from "./Player";

export async function generateStaticParams() {
  // public/projects/ の作品ぜんぶ。1 つ以上ないとビルドがエラーになるので、sample.mks は消さないでね
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
  return <Player project={project} />;
}
