import React from "react";
import { useDnD } from "./context";
import { ModuleName } from "@/backend/types";

export default ({ moduleNames }: { moduleNames: ModuleName[] }) => {
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside>
      <div className="description">Drag files to the pane on the right.</div>
      {moduleNames.map((moduleName, index) => (
        <div
          key={index}
          className="dndnode"
          onDragStart={(event) => onDragStart(event, moduleName)}
          draggable
        >
          {moduleName}
        </div>
      ))}
    </aside>
  );
};
