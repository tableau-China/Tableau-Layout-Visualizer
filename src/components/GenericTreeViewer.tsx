import React, { useState } from 'react';
import { XmlNode } from '../utils/xmlParser';

export const GenericTreeViewer: React.FC<{ node: XmlNode }> = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="ml-4 font-mono text-xs">
      <div 
        className={`p-1 border-l border-zinc-300 cursor-pointer hover:bg-zinc-100 ${hasChildren ? 'font-bold' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{hasChildren ? (isOpen ? '▼' : '▶') : '•'}</span>
        <span className="text-blue-700 ml-1">&lt;{node.tagName}</span>
        {Object.entries(node.attributes).map(([key, value]) => (
          <span key={key} className="text-red-700 ml-1">
            {key}="<span className="text-green-700">{value}</span>"
          </span>
        ))}
        <span className="text-blue-700">&gt;</span>
        {node.textContent && <span className="text-zinc-600 ml-1">{node.textContent}</span>}
      </div>
      
      {isOpen && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <GenericTreeViewer key={index} node={child} />
          ))}
        </div>
      )}
      
      {isOpen && (
        <div className="text-blue-700 ml-4">&lt;/{node.tagName}&gt;</div>
      )}
    </div>
  );
};
