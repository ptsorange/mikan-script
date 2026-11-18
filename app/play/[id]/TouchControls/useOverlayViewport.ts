import { useEffect, useState, type RefObject } from "react";
import type { GameFrameHandle } from "@/app/_components/GameFrame";

type Params = {
  stageRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<GameFrameHandle | null>;
  layoutKey: string;
};

/** ゲーム画面(iframe)が実際に表示されている位置と大きさ。タッチボタンの層を、ぴったり重ねるのに使う */
export function useOverlayViewport({ stageRef, frameRef, layoutKey }: Params) {
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // iframe の実際の表示位置に合わせて、操作領域を重ねる。
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    const frame = stage.querySelector("iframe");
    const update = () => {
      const stageBox = stage.getBoundingClientRect();
      const frameBox = frameRef.current?.getBounds();
      if (!frameBox || frameBox.width <= 0 || frameBox.height <= 0) {
        setViewport({ left: 0, top: 0, width: stageBox.width, height: stageBox.height });
        return;
      }
      setViewport({
        left: frameBox.left - stageBox.left,
        top: frameBox.top - stageBox.top,
        width: frameBox.width,
        height: frameBox.height,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    if (frame) observer.observe(frame);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [frameRef, layoutKey, stageRef]);

  return viewport;
}
