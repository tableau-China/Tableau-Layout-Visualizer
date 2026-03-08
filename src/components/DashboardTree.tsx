import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Layout, Columns, Rows, BarChart2, Filter, Type, Image as ImageIcon, Box } from 'lucide-react';
import { Zone } from '../utils/tableauDashboardParser';

interface DashboardTreeProps {
  zone: Zone;
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  level?: number;
}

const getZoneIcon = (type: string) => {
  switch (type) {
    case 'horz': return <Columns className="w-4 h-4 text-blue-600" />;
    case 'vert': return <Rows className="w-4 h-4 text-red-600" />;
    case 'worksheet': return <BarChart2 className="w-4 h-4 text-emerald-600" />;
    case 'filter': 
    case 'paramctrl': return <Filter className="w-4 h-4 text-purple-600" />;
    case 'text': return <Type className="w-4 h-4 text-zinc-600" />;
    case 'image': return <ImageIcon className="w-4 h-4 text-zinc-600" />;
    case 'layout-flow':
    case 'layout-basic': return <Layout className="w-4 h-4 text-zinc-600" />;
    default: return <Box className="w-4 h-4 text-zinc-400" />;
  }
};

const getZoneLabel = (zone: Zone) => {
  if (zone.name) return zone.name;
  switch (zone.type) {
    case 'horz': return '水平容器 (Horizontal)';
    case 'vert': return '垂直容器 (Vertical)';
    case 'worksheet': return '工作表 (Worksheet)';
    case 'filter': return '筛选器 (Filter)';
    case 'text': return '文本 (Text)';
    case 'image': return '图像 (Image)';
    case 'layout-flow': return '平铺 (Tiled)';
    case 'layout-basic': return '浮动 (Floating)';
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
        <div className="mr-2">
          {getZoneIcon(zone.type)}
        </div>
        <div className="text-sm text-zinc-700 truncate flex-1 font-medium">
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
