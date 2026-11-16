import { revalidateTag } from "next/cache";

// Supabase Storage を書き換えたあと、すぐ一覧に反映したいときに呼ぶ:
//   curl -X POST "https://mikan-script.vercel.app/api/revalidate" -H "Authorization: Bearer <REVALIDATE_SECRET>"
// Vercel の環境変数 REVALIDATE_SECRET を設定しておくこと
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidateTag("projects", "max");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
