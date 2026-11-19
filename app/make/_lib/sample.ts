import type { Locale } from "@/lib/i18n";

// はじめて開いたときに入っているコード
export const SAMPLE_CODE_JA = `// ここにプログラムを書いてね
setScreenSize(400, 300)

sprite cat = makeSprite("texture/cat.png", 50, 50, 64, 64)

onKeyDown(e) {
  cat.x += 10
}
`;

export const SAMPLE_CODE_EN = `// Write your program here
setScreenSize(400, 300)

sprite cat = makeSprite("texture/cat.png", 50, 50, 64, 64)

onKeyDown(e) {
  cat.x += 10
}
`;

export const SAMPLE_CODE = SAMPLE_CODE_JA;

export const getSampleCode = (locale: Locale) => (locale === "en" ? SAMPLE_CODE_EN : SAMPLE_CODE_JA);

export const isSampleCode = (code: string | null) => code === SAMPLE_CODE_JA || code === SAMPLE_CODE_EN;
