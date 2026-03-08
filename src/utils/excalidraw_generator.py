import json

def generate_excalidraw_json(data):
    elements = []
    
    # Canvas base
    canvas_w = data["Size"]["W"]
    canvas_h = data["Size"]["H"]
    
    for zone in data["Zones"]:
        geo = zone["Geometry"]
        is_container = zone["Type"] == "container"
        
        element = {
            "type": "rectangle",
            "x": geo["X"],
            "y": geo["Y"],
            "width": geo["W"],
            "height": geo["H"],
            "strokeColor": "#000000",
            "backgroundColor": "#f3f3f3" if not is_container else "transparent",
            "strokeWidth": 4 if is_container else 1,
            "fillStyle": "solid",
            "roughness": 0,
        }
        elements.append(element)
        
        # Label
        label = {
            "type": "text",
            "x": geo["X"] + 5,
            "y": geo["Y"] + 5,
            "text": f"{zone['ID']}: {zone['Name'] or ''}",
            "fontSize": 16,
            "fontFamily": 1,
            "textAlign": "left"
        }
        elements.append(label)
        
    return {"type": "excalidraw", "elements": elements}
