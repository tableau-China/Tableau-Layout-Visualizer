import { DashboardLayout, Zone } from './tableauDashboardParser';

export function generateExcalidrawJson(dashboard: DashboardLayout) {
  const elements: any[] = [];
  
  const processZone = (zone: Zone) => {
    const isContainer = zone.type === 'container' || zone.type === 'vert' || zone.type === 'horz';
    
    // Rectangle element
    const rectElement = {
      type: "rectangle",
      x: zone.geometry.x,
      y: zone.geometry.y,
      width: zone.geometry.w,
      height: zone.geometry.h,
      strokeColor: "#000000",
      backgroundColor: isContainer ? "transparent" : "#f3f3f3",
      strokeWidth: isContainer ? 4 : 1,
      fillStyle: "solid",
      roughness: 0,
    };
    elements.push(rectElement);
    
    // Label element
    const labelText = `${zone.id}: ${zone.name || zone.type}`;
    const textElement = {
      type: "text",
      x: zone.geometry.x + 5,
      y: zone.geometry.y + 5,
      text: labelText,
      fontSize: 16,
      fontFamily: 1,
      textAlign: "left"
    };
    elements.push(textElement);

    // Recursively process children
    zone.children.forEach(processZone);
  };

  dashboard.zones.forEach(processZone);

  return {
    type: "excalidraw",
    version: 2,
    source: "Tableau Dashboard Parser",
    elements: elements
  };
}
