import React from 'react';
import { DashboardLayout, Zone } from '../utils/tableauDashboardParser';

interface SvgVisualizerProps {
  dashboard: DashboardLayout;
  selectedZoneId: string | null;
}

const getZoneColor = (type: string) => {
  switch (type) {
    case 'horz': return { stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.05)' }; // blue-600
    case 'vert': return { stroke: '#dc2626', fill: 'rgba(220, 38, 38, 0.05)' }; // red-600
    case 'worksheet': return { stroke: '#059669', fill: 'rgba(5, 150, 105, 0.1)' }; // emerald-600
    case 'filter': 
    case 'paramctrl': return { stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.1)' }; // purple-600
    default: return { stroke: '#52525b', fill: 'rgba(82, 82, 91, 0.05)' }; // zinc-600
  }
};

export const SvgVisualizer: React.FC<SvgVisualizerProps> = ({ dashboard, selectedZoneId }) => {
  const { width, height } = dashboard.size;

  const renderZone = (zone: Zone) => {
    const { x, y, w, h } = zone.geometry;
    const { stroke, fill } = getZoneColor(zone.type);
    const isSelected = selectedZoneId === zone.id;
    
    const actualStroke = isSelected ? '#f59e0b' : stroke; // amber-500
    const actualFill = isSelected ? 'rgba(245, 158, 11, 0.2)' : fill;
    const strokeWidth = isSelected ? 4 : 1;

    return (
      <g key={zone.id}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={actualFill}
          stroke={actualStroke}
          strokeWidth={strokeWidth}
          className="transition-all duration-200"
        />
        {/* Only show text for non-container or if it's selected to avoid clutter */}
        {(zone.type !== 'horz' && zone.type !== 'vert' && zone.type !== 'layout-flow' && zone.type !== 'layout-basic' || isSelected) && (
          <>
            <text
              x={x + 5}
              y={y + 16}
              fontSize="12"
              fontFamily="monospace"
              fill="#333"
              fontWeight="bold"
            >
              ID: {zone.id} | {zone.name || zone.type}
            </text>
            <text
              x={x + 5}
              y={y + 32}
              fontSize="10"
              fontFamily="monospace"
              fill="#666"
            >
              {w}x{h} | {zone.isFloating ? 'Float' : 'Tiled'} {zone.isFixed ? '| Fixed' : ''}
            </text>
          </>
        )}
        {zone.children.map(renderZone)}
      </g>
    );
  };

  return (
    <div className="w-full overflow-auto bg-zinc-100 p-4 rounded-lg border border-zinc-200 flex justify-center items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '800px', backgroundColor: 'white' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {dashboard.zones.map(renderZone)}
      </svg>
    </div>
  );
};
