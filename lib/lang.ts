
const commands = [
  { en: "makeShapeSprite", jp: "図形スプライト作成" },
  { en: "move", jp: "動く" },
];

export const getCommand = (codeLine: string) => {
  const name = codeLine.trim().split("(")[0];
  return commands.findIndex(command => command.en === name || command.jp === name);
}

export const getInside = (firstChar: string, lastChar: string, text: string) => {
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