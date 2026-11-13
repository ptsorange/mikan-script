"use client";

import { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import "blockly/msg/ja"; 

export default function BlocklyEditor() {
  const blocklyDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (blocklyDiv.current) {
      Blockly.inject(blocklyDiv.current, {
        toolbox: `
          <xml>
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="math_number"></block>
          </xml>
        `,
      });
    }
  }, []);

  return <div ref={blocklyDiv} style={{ height: "500px", width: "100%" }} />;
}