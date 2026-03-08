export interface Zone {
  id: string;
  name?: string;
  type: string;
  geometry: { x: number; y: number; w: number; h: number };
  fixedSize?: number;
  isFixed: boolean;
  isFloating: boolean;
  padding: string;
  hierarchy: string | null;
  children: Zone[];
}

export interface DashboardLayout {
  name: string;
  size: { width: number; height: number; mode: string };
  zones: Zone[];
}

export function parseDashboardLayout(xmlString: string): DashboardLayout[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  const dashboards = xmlDoc.querySelectorAll('dashboard');
  const results: DashboardLayout[] = [];

  dashboards.forEach((db) => {
    const name = db.getAttribute('name') || 'Unknown Dashboard';
    const sizeEl = db.querySelector('size');
    const width = parseInt(sizeEl?.getAttribute('maxwidth') || '1900', 10);
    const height = parseInt(sizeEl?.getAttribute('maxheight') || '1400', 10);
    const mode = sizeEl?.getAttribute('sizing-mode') || 'unknown';

    const size = { width, height, mode };

    const zones: Zone[] = [];
    
    function parseZone(zone: Element, parentId: string | null): Zone {
      const id = zone.getAttribute('id') || 'unknown';
      const zoneName = zone.getAttribute('name') || undefined;
      
      const param = zone.getAttribute('param');
      
      // Get direct child zones
      const childZones = Array.from(zone.children).filter(child => child.tagName === 'zone');
      
      // Determine type: vert, horz, worksheet, text, etc.
      let type = param || zone.getAttribute('type') || 'container';
      if (!param && childZones.length === 0) {
        type = 'worksheet';
      }

      const isFixed = zone.getAttribute('is-fixed') === 'true';
      const isFloating = zone.getAttribute('is-floating') === 'true';
      const fixedSize = zone.getAttribute('fixed-size') ? parseInt(zone.getAttribute('fixed-size')!, 10) : undefined;
      
      // Extract padding
      const paddingFormat = Array.from(zone.querySelectorAll(':scope > format')).find(child => child.getAttribute('attr') === 'padding');
      const padding = paddingFormat ? paddingFormat.getAttribute('value') || '4' : '4';

      // Tableau 100,000 unit conversion to actual pixels
      const rawX = parseInt(zone.getAttribute('x') || '0', 10);
      const rawY = parseInt(zone.getAttribute('y') || '0', 10);
      const rawW = parseInt(zone.getAttribute('w') || '0', 10);
      const rawH = parseInt(zone.getAttribute('h') || '0', 10);

      const geometry = {
        x: Math.round((rawX / 100000) * width),
        y: Math.round((rawY / 100000) * height),
        w: Math.round((rawW / 100000) * width),
        h: Math.round((rawH / 100000) * height),
      };

      const parsedChildren: Zone[] = [];
      childZones.forEach(cz => parsedChildren.push(parseZone(cz, id)));

      return {
        id,
        name: zoneName,
        type,
        geometry,
        fixedSize,
        isFixed,
        isFloating,
        padding,
        hierarchy: parentId,
        children: parsedChildren
      };
    }

    // Find the <zones> container or direct <zone> children
    const zonesContainer = db.querySelector('zones');
    let topZones: Element[] = [];
    if (zonesContainer) {
      topZones = Array.from(zonesContainer.children).filter(child => child.tagName === 'zone');
    } else {
      topZones = Array.from(db.children).filter(child => child.tagName === 'zone');
    }
    
    topZones.forEach(z => zones.push(parseZone(z, null)));

    results.push({ name, size, zones });
  });

  return results;
}
