"use client";

import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  cursor: { line: number; col: number };
  textureCount: number;
  soundCount: number;
  codeCount: number;
};

// 下のバー: カーソルの位置・画像と音とコードファイルの数
export default function StatusBar({ cursor, textureCount, soundCount, codeCount }: Props) {
  const { t } = useLocale();

  return (
    <footer className="kc-status">
      <span>{t.editor.status.cursor(cursor.line, cursor.col)}</span>
      <span>{t.editor.status.autoSave}</span>
      <span>{t.editor.status.counts(textureCount, soundCount, codeCount)}</span>
    </footer>
  );
}
