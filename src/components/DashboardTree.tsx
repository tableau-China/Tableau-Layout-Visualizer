import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Zone } from '../utils/tableauDashboardParser';

interface DashboardTreeProps {
  zone: Zone;
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  level?: number;
}

const TableauIcons = {
  Tiled: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12"/><path d="M6 2v12M2 6h4"/></svg>,
  Horizontal: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="5" height="12"/><rect x="9" y="2" width="5" height="12"/></svg>,
  Vertical: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="12" height="4"/><rect x="2" y="9" width="12" height="4"/></svg>,
  Worksheet: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12"/><path d="M4 12V8m4 4V5m4 7v-3" strokeWidth="1.5"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 3h12L9 9v5l-2 2V9L2 3z"/></svg>,
  Legend: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M6 4h8M6 8h8M6 12h8M3 4h.01M3 8h.01M3 12h.01" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Text: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 4V2h12v2M8 2v12M6 14h4"/></svg>,
  Image: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12"/><circle cx="6" cy="6" r="1.5"/><path d="M2 10l4-4 6 6"/></svg>,
  Unknown: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="10" height="10"/></svg>
};

const getZoneIcon = (type: string) => {
  switch (type) {
    case 'horz': return <TableauIcons.Horizontal />;
    case 'vert': return <TableauIcons.Vertical />;
    case 'worksheet': return <TableauIcons.Worksheet />;
    case 'filter': 
    case 'paramctrl': return <TableauIcons.Filter />;
    case 'color':
    case 'size':
    case 'shape': return <TableauIcons.Legend />;
    case 'text': return <TableauIcons.Text />;
    case 'image': return <TableauIcons.Image />;
    case 'layout-flow':
    case 'layout-basic': return <TableauIcons.Tiled />;
    default: return <TableauIcons.Unknown />;
  }
};

const getZoneLabel = (zone: Zone) => {
  if (zone.name) return zone.name;
  switch (zone.type) {
    case 'horz': return '水平容器';
    case 'vert': return '垂直容器';
    case 'worksheet': return '工作表';
    case 'filter': return '筛选器';
    case 'color':
    case 'size':
    case 'shape': return '图例';
    case 'text': return '文本';
    case 'image': return '图像';
    case 'layout-flow': return '平铺';
    case 'layout-basic': return '浮动';
    default: return zone.type;
  }
};

export const DashboardTree: React.FC<DashboardTreeProps> = ({ 
  zone, 
  selectedZoneId, 
  onSelectZone, 
  level = 0 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = zone.children.length > 0;
  const isSelected = selectedZoneId === zone.id;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1.5 px-2 cursor-pointer rounded transition-colors ${
          isSelected ? 'bg-amber-100 border-amber-300 border' : 'border border-transparent hover:bg-zinc-100'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectZone(zone.id);
        }}
      >
        <div 
          className="w-4 h-4 mr-1 flex items-center justify-center"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500 hover:text-zinc-800" /> : <ChevronRight className="w-3 h-3 text-zinc-500 hover:text-zinc-800" />
          ) : null}
        </div>
        <div className="mr-2 text-zinc-600">
          {getZoneIcon(zone.type)}
        </div>
        <div className="text-sm text-zinc-800 truncate flex-1 font-normal">
          {getZoneLabel(zone)}
        </div>
        <div className="text-[10px] text-zinc-400 ml-2 whitespace-nowrap bg-zinc-100 px-1.5 py-0.5 rounded">
          Pad: {zone.padding}
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {zone.children.map(child => (
            <DashboardTree 
              key={child.id} 
              zone={child} 
              selectedZoneId={selectedZoneId} 
              onSelectZone={onSelectZone} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
