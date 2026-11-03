"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputCode, setInputCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const codeIDEn = ["sprite", "move"];
  const codeIDJp = ["スプライト", "動く"];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameScreen = canvas.getContext('2d');
    if (!gameScreen) return;
  }, []);

  const getCommand = (codeLine: string) => {
    for (let i = 0; i < codeIDEn.length; i++) {
      if (codeLine.startsWith(codeIDEn[i])) return i
      if (codeLine.startsWith(codeIDJp[i])) return i
    }
  }

  const getInside = (firstChar: string, lastChar: string, text: string) => {
    let inside = "";
    let i = text.indexOf(firstChar);
    let j = 1;

    while (i < text.length - 1 && j > 0) {
      i++;
      if (text[i] === firstChar) j++;
      if (text[i] === lastChar) j--;
      if (j > 0) {
        inside += text[i];
      }
    }
    return inside;
  }

  const runCode = () => {
    let spriteData: any = [];
    const lines = inputCode.split(";");
    console.log(lines)
    lines.forEach(codeLine => {
      const command = getCommand(codeLine.replace("\n",""));
      if (command == 0) {
        const pr = getInside("(", ")", codeLine).split(",");
        spriteData.push([Number(pr[0]), Number(pr[1]), Number(pr[2]), Number(pr[3]), pr[4].trim()]);
      }
    });

    let jsCode = `let spriteData = ${JSON.stringify(spriteData)};\n`;
    jsCode += `const canvas = document.getElementById("gameScreen");\n`;
    jsCode += `const ctx = canvas.getContext("2d");\n`;
    jsCode += `spriteData.forEach(sprite => {\n`;
    jsCode += `  ctx.fillStyle = sprite[4];\n`;
    jsCode += `  ctx.fillRect(sprite[0], sprite[1], sprite[2], sprite[3]);\n`;
    jsCode += `});`;

    try {
      new Function(jsCode)();
    } catch (e) {
      console.error(e);
    }
    console.log(jsCode);
  };

  return (
    <div>
      <textarea id="codeEdittor" value={inputCode} onChange={(e) => setInputCode(e.target.value)}></textarea>
      <button onClick={(runCode)}>Run</button>
      <canvas ref={canvasRef} id="gameScreen" width="400" height="300" className="border border-white m-1" />
    </div>
  );
}