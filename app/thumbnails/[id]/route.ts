import { listProjects, getThumbnail } from "@/lib/projects";

// 一覧のサムネイル画像。.mks の一番上にある thumbnail.png を返す
export async function generateStaticParams() {
  return (await listProjects()).map((p) => ({ id: p.id }));
}

export async function GET(_req: Request, ctx: RouteContext<"/thumbnails/[id]">) {
  const { id } = await ctx.params;
  let name = id;
  try {
    name = decodeURIComponent(id);
  } catch {
    /* そのまま使う */
  }
  const thumb = await getThumbnail(name);
  if (!thumb) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(thumb.base64, "base64"), {
    headers: {
      "Content-Type": thumb.type,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
