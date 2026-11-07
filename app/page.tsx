"use client";

import { useEffect, useRef, useState } from "react";
import { splitCode, compile, RUNTIME } from "@/lib/lang";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputCode, setInputCode] = useState("");
  const [log, setLog] = useState("");
  const sampleParms = [[0, 0, 50, 50, "white"]]

  console.log(splitCode(inputCode))

  useEffect(() => {
    setInputCode(localStorage.getItem("code") ?? "");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameScreen = canvas.getContext('2d');
    if (!gameScreen) return;
  }, []);

  const onChange = (value: string) => {
    setInputCode(value);
    localStorage.setItem("code", value);
  };

  //   const canvas = document.getElementById("gameScreen");
  //   const ctx = canvas.getContext("2d");
  //   ctx.reset();
  //   spriteData.forEach(sprite => {
  //     ctx.fillStyle = sprite[4];
  //     ctx.fillRect(sprite[0], sprite[1], sprite[2], sprite[3]);
  //   });
  // `;

  // jsCode = `let spriteData = ${JSON.stringify(spriteData)};\n` + jsCode;

  const runCode = () => {
    const js = `(async () => {
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
const log = document.getElementById("logBox");
log.textContent = "";
const addLog = (t) => { log.textContent += t; };
const clearLog = () => { log.textContent = ""; };
${RUNTIME}
${compile(splitCode(inputCode), [])}
})();`;
    console.log(js);
    new Function(js)();
  };

  const stopCode = () => {
    (window as any).__runId = ((window as any).__runId ?? 0) + 1;
    ((window as any).__cleanups ?? []).forEach((f: any) => f());
    (window as any).__cleanups = [];
  };

  return (
    <div className="flex">
      <textarea id="codeEdittor" value={inputCode} onChange={(e) => onChange(e.target.value)} className="w-1/2" />
      <div className="flex flex-col">
        <div className="flex">
          <button onClick={(runCode)}>Run</button>
          <button onClick={(stopCode)}>stop</button>
        </div>
        <canvas ref={canvasRef} id="gameScreen" width="400" height="300" className="border border-white m-1" />
        <pre id="logBox">{log}</pre>
      </div>
    </div>
  );
}