export interface XmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  textContent?: string;
}

export function parseXmlToTree(xmlString: string): XmlNode | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    console.error('XML Parsing Error:', parserError.textContent);
    return null;
  }

  const rootElement = xmlDoc.documentElement;
  return convertElementToNode(rootElement);
}

function convertElementToNode(element: Element): XmlNode {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  const children: XmlNode[] = [];
  for (let i = 0; i < element.children.length; i++) {
    children.push(convertElementToNode(element.children[i]));
  }

  // Get text content if it's a leaf node or has simple text
  let textContent = undefined;
  if (element.children.length === 0) {
    textContent = element.textContent?.trim();
  }

  return {
    tagName: element.tagName,
    attributes,
    children,
    textContent: textContent || undefined,
  };
}
