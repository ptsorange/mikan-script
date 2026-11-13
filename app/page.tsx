// app/page.tsx
"use client";

import dynamic from "next/dynamic";

const BlocklyEditor = dynamic(
  () => import("@/app/_components/BlocklyEditor"),
  { ssr: false }
);

export default function Page() {
  return (
    <main style={{ padding: "20px" }}>
      <h1>Next.js + Blockly エディタ</h1>
      <BlocklyEditor />
    </main>
  );
}