"use client";

import { useEffect, useRef, useState } from "react";
import { getCommand, getInside, commands, splitCode } from "@/lib/lang";

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

  const runCode = () => {
    let spriteData: any = [];
    let jsCode = `
      const canvas = document.getElementById("gameScreen");
      const ctx = canvas.getContext("2d");
      ctx.reset();
      spriteData.forEach(sprite => {
        ctx.fillStyle = sprite[4];
        ctx.fillRect(sprite[0], sprite[1], sprite[2], sprite[3]);
      });
    `;
    setLog("");
    const lines = inputCode.split(/[;\n]/);

    lines.forEach(codeLine => {
      if (codeLine.startsWith("//") || codeLine.startsWith("#") || codeLine == "") return;
      const command = getCommand(codeLine.trim());
      if (command == 0) {
        const pr = getInside("(", ")", codeLine).split(",");
        spriteData.push([
          1 <= pr.length ? Number(pr[0]) : sampleParms[0][0],
          2 <= pr.length ? Number(pr[1]) : sampleParms[0][1],
          3 <= pr.length ? Number(pr[2]) : sampleParms[0][2],
          4 <= pr.length ? Number(pr[3]) : sampleParms[0][3],
          5 <= pr.length ? pr[4].trim() : sampleParms[0][4]
        ]);
      }
      if (commands[command].en == "print") {
        const text = getInside("(", ")", codeLine.trim());
        jsCode += `setLog((prev) => prev + ${text} + "\\n");\n`;
      }
      if (commands[command].en == "text") {
        const text = getInside("(", ")", codeLine.trim());
        jsCode += `setLog((prev) => prev + ${text} + "\\n");\n`;
      }
    });

    jsCode = `let spriteData = ${JSON.stringify(spriteData)};\n` + jsCode;

    try {
      new Function("setLog", jsCode)(setLog);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex">
      <textarea id="codeEdittor" value={inputCode} onChange={(e) => onChange(e.target.value)} className="w-1/2" />
      <div className="flex flex-col">
        <button onClick={(runCode)}>Run</button>
        <canvas ref={canvasRef} id="gameScreen" width="400" height="300" className="border border-white m-1" />
        {log}
      </div>
    </div>
  );
}