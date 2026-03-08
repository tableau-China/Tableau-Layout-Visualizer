import xml.etree.ElementTree as ET
import json

def parse_tableau_twb(xml_content):
    root = ET.fromstring(xml_content)
    
    # 1. Locate the first dashboard
    dashboards = root.findall('.//dashboards/dashboard')
    if not dashboards:
        return "No dashboard found."
    
    dashboard = dashboards[0]
    db_name = dashboard.get('name', 'Unknown')
    
    # 2. Get total size
    size_el = dashboard.find('size')
    width = int(size_el.get('maxwidth', 1900))
    height = int(size_el.get('maxheight', 1400))
    
    # 3. Parse zones
    zones_data = []
    
    def parse_zone(zone, parent_id=None):
        zone_id = zone.get('id')
        name = zone.get('name')
        
        # Determine type
        param = zone.get('param')
        zone_type = param if param else ('worksheet' if zone.find('zone') is None else 'container')
        
        # Geometry conversion
        x = (int(zone.get('x', 0)) / 100000) * width
        y = (int(zone.get('y', 0)) / 100000) * height
        w = (int(zone.get('w', 0)) / 100000) * width
        h = (int(zone.get('h', 0)) / 100000) * height
        
        zone_info = {
            "ID": zone_id,
            "Name": name,
            "Type": zone_type,
            "Geometry": {"X": x, "Y": y, "W": w, "H": h},
            "Fixed-Size": zone.get('is-fixed') == 'true',
            "Hierarchy": parent_id
        }
        zones_data.append(zone_info)
        
        for child in zone.findall('zone'):
            parse_zone(child, zone_id)

    root_zone = dashboard.find('zone')
    if root_zone is not None:
        parse_zone(root_zone)
        
    return {"Dashboard": db_name, "Size": {"W": width, "H": height}, "Zones": zones_data}

# Example usage (assuming xml_content is loaded):
# result = parse_tableau_twb(xml_content)
# print(json.dumps(result, indent=2))
