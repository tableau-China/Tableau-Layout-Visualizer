import React from 'react';
import { LayoutObject } from '../utils/tableauParser';

interface LayoutVisualizerProps {
  node: LayoutObject;
}

export const LayoutVisualizer: React.FC<{ node: LayoutObject }> = ({ node }) => {
  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'layout-flow': return 'bg-blue-100';
      case 'layout-vertical': return 'bg-green-100';
      case 'layout-horizontal': return 'bg-yellow-100';
      case 'worksheet': return 'bg-purple-100';
      default: return 'bg-zinc-100';
    }
  };

  return (
    <div
      className={`border border-zinc-300 ${getBackgroundColor(node.type)}`}
      style={{
        width: node.size ? `${node.size.width}px` : '100%',
        height: node.size ? `${node.size.height}px` : '100%',
        position: node.position ? 'absolute' : 'relative',
        left: node.position ? `${node.position.x}px` : '0',
        top: node.position ? `${node.position.y}px` : '0',
        padding: node.padding ? `${node.padding.top}px` : '4px',
        boxSizing: 'border-box',
      }}
    >
      <div className="text-xs font-bold text-zinc-700 mb-1 truncate">
        {node.type} {node.size && `(${node.size.width}x${node.size.height})`}
      </div>
      {node.children.map((child) => (
        <LayoutVisualizer key={child.id} node={child} />
      ))}
    </div>
  );
}
