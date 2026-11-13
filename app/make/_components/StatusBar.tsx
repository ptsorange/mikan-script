type Props = {
  cursor: { line: number; col: number };
  textureCount: number;
  soundCount: number;
};

// 下のバー: カーソルの位置・画像と音の数
export default function StatusBar({ cursor, textureCount, soundCount }: Props) {
  return (
    <footer className="kc-status">
      <span>
        {cursor.line} 行目、{cursor.col} 文字目
      </span>
      <span>自動で保存されます</span>
      <span>
        画像 {textureCount} 枚 ・ 音 {soundCount} 個
      </span>
    </footer>
  );
}
