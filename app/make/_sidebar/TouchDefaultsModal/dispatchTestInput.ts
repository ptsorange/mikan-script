import type { TouchArea } from "@/lib/touchControls";

/* 「テスト」で押したボタンを、ページの中のゲーム画面に、キーボード・マウスの入力として送る */

function getLegacyKeyCode(key: string): number {
  const known: Record<string, number> = {
    " ": 32,
    Space: 32,
    Enter: 13,
    Escape: 27,
    Backspace: 8,
    Tab: 9,
    Shift: 16,
    Control: 17,
    Alt: 18,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Delete: 46,
  };
  if (known[key] !== undefined) return known[key];
  return key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
}

function getInputCode(key: string): string {
  if (key === " ") return "Space";
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return key;
}

/**
 * 設定画面のテストボタンから、ページ内のゲーム画面へ入力イベントを送る。
 * 同一オリジンの iframe が使われている場合も対象にする。
 */
export function dispatchTestInput(area: TouchArea, pressed: boolean) {
  if (typeof document === "undefined") return;

  const documents: Document[] = [document];
  for (const frame of Array.from(document.querySelectorAll("iframe"))) {
    try {
      const frameDocument = frame.contentDocument;
      if (frameDocument && !documents.includes(frameDocument)) documents.push(frameDocument);
    } catch {
      // 別オリジンの iframe にはアクセスできない
    }
  }

  for (const doc of documents) {
    const target: EventTarget = doc.querySelector("canvas") ?? doc.body ?? doc;

    if (area.kind === "key") {
      const key = area.value === " " ? " " : area.value;
      const event = new KeyboardEvent(pressed ? "keydown" : "keyup", {
        key,
        code: getInputCode(key),
        bubbles: true,
        cancelable: true,
      });
      const legacyCode = getLegacyKeyCode(key);
      try {
        Object.defineProperties(event, {
          keyCode: { get: () => legacyCode },
          which: { get: () => legacyCode },
        });
      } catch {
        // key/code が利用できれば旧式プロパティは不要
      }
      target.dispatchEvent(event);
    } else {
      const button = area.value === "middle" ? 1 : area.value === "right" ? 2 : 0;
      const buttons = pressed ? (1 << button) : 0;
      target.dispatchEvent(
        new MouseEvent(pressed ? "mousedown" : "mouseup", {
          button,
          buttons,
          bubbles: true,
          cancelable: true,
          view: doc.defaultView,
        })
      );
      if (!pressed) {
        // 通常のクリックと同様、mouseup の後に click も発生させる
        target.dispatchEvent(
          new MouseEvent("click", {
            button,
            buttons: 0,
            bubbles: true,
            cancelable: true,
            detail: 1,
            view: doc.defaultView,
          })
        );
      }
    }
  }
}
