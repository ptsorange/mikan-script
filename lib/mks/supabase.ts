// 公開プロジェクトを保存している Supabase Storage
export const PROJECTS_BUCKET_NAME = "mikanScriptProjects";
export const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ihvbsisbjlhhqwghxhvp.supabase.co"
).replace(/\/+$/, "");

// version には Storage の updated_at を渡す。同じファイル名で上書きしても
// URL が変わるので、Supabase の CDN やブラウザの古いキャッシュを見なくなる
export const getProjectPublicUrl = (fileName: string, version?: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${PROJECTS_BUCKET_NAME}/${encodeURIComponent(fileName)}${
    version ? `?v=${encodeURIComponent(version)}` : ""
  }`;
