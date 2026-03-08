import React from 'react';
import { LayoutObject } from '../utils/tableauParser';

export const TreeViewer: React.FC<{ node: LayoutObject }> = ({ node }) => {
  return (
    <div className="ml-4">
      <div className="font-mono text-xs p-1 border-l border-zinc-300">
        <span className="font-bold text-zinc-700">{node.type}</span>
        <span className="text-zinc-500"> (id: {node.id})</span>
        {node.name && <span className="text-zinc-400 ml-2">name: {node.name}</span>}
        {node.attributes && (
          <div className="text-zinc-400 text-[10px] mt-1 break-all">
            {JSON.stringify(node.attributes)}
          </div>
        )}
      </div>
      {node.children.map((child) => (
        <TreeViewer key={child.id} node={child} />
      ))}
    </div>
  );
};
