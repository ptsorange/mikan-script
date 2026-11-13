import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

// サイドバー幅をマウスのドラッグで変える
export function useSidebarResize(initialWidth = 230) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const isResizingRef = useRef(false);

  const startResizing = (e: ReactMouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const bodyEl = document.querySelector(".kc-body");
      if (!bodyEl) return;
      const rect = bodyEl.getBoundingClientRect();
      const newWidth = moveEvent.clientX - rect.left - 48; // 48pxは活動バーの幅
      if (newWidth >= 150 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return { sidebarWidth, startResizing };
}
