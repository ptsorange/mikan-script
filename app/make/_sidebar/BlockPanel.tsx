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
  const el = divRef.current;
  if (!el) return;
  let ws: Blockly.WorkspaceSvg | null = null;

  const init = () => {
    if (ws || !el.clientWidth || !el.clientHeight) return; // サイズが出てから作る
    defineMikanBlocks();
    ws = Blockly.inject(el, {
      toolbox: TOOLBOX,
      theme: mikanTheme,
      renderer: "thrasos",
      // ワークスペース関連の機能は全部オフ
      scrollbars: false,
      trashcan: false,
      zoom: { controls: false, wheel: false, pinch: false },
      move: { scrollbars: false, drag: false, wheel: false },
      sounds: false,
    });

    // ブロック一覧を出しっぱなしにして、最初のカテゴリを開いておく
    const flyout = ws.getFlyout();
    if (flyout) flyout.autoClose = false;
    ws.getToolbox()?.selectItemByPosition(0);

    // ブロックをドラッグして置かれても、すぐ消す(置き場はないので)
    const w = ws;
    w.addChangeListener((ev: Blockly.Events.Abstract) => {
      if (ev.type === Blockly.Events.BLOCK_CREATE) {
        const id = (ev as Blockly.Events.BlockCreate).blockId;
        if (id) w.getBlockById(id)?.dispose(false);
      }
    });

    // 一覧のブロックをクリックしたら呼び出し元へ
    const flyoutWs = flyout?.getWorkspace();
    flyoutWs?.addChangeListener((ev: Blockly.Events.Abstract) => {
      if (ev.type !== Blockly.Events.CLICK) return;
      const click = ev as Blockly.Events.Click;
      if (click.targetType !== "block" || !click.blockId) return;
      const block = flyoutWs.getBlockById(click.blockId);
      if (block) pickRef.current(block.getRootBlock());
    });
  };

  const ro = new ResizeObserver(() => {
    if (!ws) init();
    else Blockly.svgResize(ws);
  });
  ro.observe(el);

  return () => {
    ro.disconnect();
    ws?.dispose();
    ws = null;
  };
}, []);

  return <div ref={divRef} style={{ height: "100%", width: "100%", minHeight: "400px" }} />;
}
