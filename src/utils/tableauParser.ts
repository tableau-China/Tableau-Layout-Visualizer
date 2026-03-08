export interface LayoutObject {
  id: string;
  type: string;
  name?: string;
  children: LayoutObject[];
  padding?: { top: number; bottom: number; left: number; right: number };
  size?: { width: number; height: number };
  position?: { x: number; y: number };
  attributes?: Record<string, string>;
}

export function parseTwb(xmlString: string): LayoutObject | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Tableau dashboards are typically inside <dashboard> tags
  const dashboard = xmlDoc.querySelector('dashboard');
  if (!dashboard) return null;

  // Extract dashboard size
  const sizeElement = dashboard.querySelector('size');
  let dashboardSize = undefined;
  if (sizeElement) {
    const w = sizeElement.getAttribute('maxwidth') || sizeElement.getAttribute('minwidth');
    const h = sizeElement.getAttribute('maxheight') || sizeElement.getAttribute('minheight');
    if (w && h) {
      dashboardSize = { width: parseInt(w, 10), height: parseInt(h, 10) };
    }
  }

  const rootZone = dashboard.querySelector('zone');
  if (!rootZone) return null;

  const rootLayout = parseZone(rootZone);
  
  // Override root size if dashboard size found
  if (dashboardSize) {
    rootLayout.size = dashboardSize;
  }
  
  return rootLayout;
}

function parseZone(zone: Element): LayoutObject {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < zone.attributes.length; i++) {
    const attr = zone.attributes[i];
    attributes[attr.name] = attr.value;
  }

  const type = zone.getAttribute('type') || zone.getAttribute('param') || 'unknown';
  const id = zone.getAttribute('id') || 'unknown';
  const name = zone.getAttribute('name') || undefined;

  const layoutObject: LayoutObject = {
    id,
    type,
    name,
    children: [],
    attributes,
  };

  const w = zone.getAttribute('w');
  const h = zone.getAttribute('h');
  if (w && h) {
    layoutObject.size = { width: parseInt(w, 10), height: parseInt(h, 10) };
  }

  const x = zone.getAttribute('x');
  const y = zone.getAttribute('y');
  if (x && y) {
    layoutObject.position = { x: parseInt(x, 10), y: parseInt(y, 10) };
  }

  // Try to parse size/padding from 'style' or 'formatted-text' or similar attributes if present
  const style = zone.getAttribute('style');
  if (style) {
    const paddingMatch = style.match(/padding:\s*(\d+)px/);
    if (paddingMatch) {
      const p = parseInt(paddingMatch[1], 10);
      layoutObject.padding = { top: p, bottom: p, left: p, right: p };
    }
  }

  // Parse children zones
  const childZones = zone.querySelectorAll(':scope > zone');
  childZones.forEach((child) => {
    layoutObject.children.push(parseZone(child));
  });

  return layoutObject;
}
