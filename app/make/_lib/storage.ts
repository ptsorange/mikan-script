import { kindOf, type Asset } from "@/lib/mks";

/* ---------- 保存場所 ----------
   コード・作品の情報・サムネは localStorage。
   音は画像よりずっと大きいので、5MB ほどしか入らない localStorage ではなく
   IndexedDB に入れる(画像と音は、どちらもここ)。 */

export const CODE_KEY = "code";
export const META_KEY = "meta";
export const THUMB_KEY = "thumbnail";
export const LEGACY_TEXTURE_KEY = "textures"; // 前のバージョンが localStorage に入れていた画像

const DB_NAME = "mikan-script";
const STORE = "assets";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "name" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const loadAssets = async (): Promise<Asset[]> => {
  const db = await openDb();
  try {
    return await new Promise<Asset[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Asset[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

// ぜんぶ入れかえる。1 回のまとまりで書くので、失敗したら何も変わらない
export const storeAssets = async (assets: Asset[]) => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      assets.forEach((a) => store.put(a));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const isAsset = (a: unknown): a is Asset => {
  const t = a as Asset;
  return typeof t?.name === "string" && typeof t?.data === "string" && kindOf(t.name) !== null;
};
