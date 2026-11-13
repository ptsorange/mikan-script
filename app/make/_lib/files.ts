import { MIME, extOf } from "@/lib/mks";

export const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// ブラウザによって種類(MIME)が空になることがあるので、拡張子から付けなおす
export const withMime = (data: string, name: string) => {
  const mime = MIME[extOf(name)];
  const i = data.indexOf(",");
  return mime && i !== -1 ? `data:${mime};base64,${data.slice(i + 1)}` : data;
};
