"use client";

import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import "blockly/msg/ja";
import { defineMikanBlocks, TOOLBOX } from "@/lib/blocks";
import { mikanTheme } from "@/lib/blockTheme";

type Props = {
  /** サイドバーのブロックが押されたときに呼ばれる(コードにしてエディタに入れるのは呼ぶ側の仕事) */
  onPickBlock: (block: Blockly.Block) => void;
};

// ブロックでコードを作るパネル。Blockly の準備と後片づけは、ここだけでやる
export default function BlockPanel({ onPickBlock }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  // 毎回の描画で作りなおされる関数を、Blockly のリスナーから呼ぶための ref
  const pickRef = useRef(onPickBlock);
  useEffect(() => {
    pickRef.current = onPickBlock;
  });

  useEffect(() => {
    let ws: Blockly.WorkspaceSvg | null = null;
    // 少し遅延させることで、DOMの描画（表示切り替え）が完了した後に確実にサイズを取得できるようにする
    const timer = setTimeout(() => {
      if (!divRef.current) return;
      defineMikanBlocks();
      // thrasos: 立体のかげがない、平らな見た目(エディタに合わせる)
      ws = Blockly.inject(divRef.current, { toolbox: TOOLBOX, theme: mikanTheme, renderer: "thrasos" });

      // サイドバー(フライアウト)のブロックを押したら、呼び出し元に渡す
      const flyoutWs = ws.getFlyout()?.getWorkspace();
      flyoutWs?.addChangeListener((ev: Blockly.Events.Abstract) => {
        if (ev.type !== Blockly.Events.CLICK) return;
        const click = ev as Blockly.Events.Click;
        if (click.targetType !== "block" || !click.blockId) return;
        const block = flyoutWs.getBlockById(click.blockId);
        if (block) pickRef.current(block.getRootBlock());
      });
    }, 50);
    // パネルを閉じると div ごと消えるので、ここで片づける(開きなおしたとき真っ白にならないように)
    return () => {
      clearTimeout(timer);
      ws?.dispose();
    };
  }, []);

  return <div ref={divRef} style={{ height: "100%", width: "100%", minHeight: "400px" }} />;
}
