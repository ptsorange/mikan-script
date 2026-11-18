export type Candidate = {
  label: string; // 表示する名前(これを入力する)
  detail: string; // 右がわの説明
  kind: "kw" | "fn" | "var" | "member" | "file";
  body: string; // 入れる文章。$0 の位置にカーソルが来る
};

export type Completion = { from: number; items: Candidate[]; typed: string };
