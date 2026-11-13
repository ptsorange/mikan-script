import { useState } from "react";
import { CODE_KEY } from "../_lib/storage";

// 入力欄のコード。書きかえるたびに localStorage にも保存する
export function useCode() {
  const [inputCode, setInputCode] = useState("");

  const updateCode = (value: string) => {
    setInputCode(value);
    localStorage.setItem(CODE_KEY, value);
  };

  return { inputCode, setInputCode, updateCode };
}
