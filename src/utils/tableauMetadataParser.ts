export interface TableauField {
  id: string; // e.g., [Calculation_123] or [Profit]
  name: string; // caption or name
  dataType: string;
  role: string;
  type: string; // quantitative, nominal, etc.
  isCalculated: boolean;
  formula?: string;
  dependencies: string[]; // array of field ids or names it depends on
  usedInViews: string[]; // names of worksheets where this field is used
  tableName?: string; // the table this field belongs to
}

export interface TableauParameter {
  id: string;
  name: string;
  dataType: string;
  value: string;
  domainType?: string;
  listValues?: { value: string; alias?: string }[];
  range?: { min?: string; max?: string; step?: string };
}

export interface TableauTable {
  id: string;
  name: string;
  customSql?: string;
}

export interface TableauRelation {
  leftTable: string;
  rightTable: string;
  joinType?: string;
  expression?: string;
  leftType?: string; // e.g., 'many', 'one'
  rightType?: string; // e.g., 'many', 'one'
}

export interface TableauDatasource {
  id: string;
  name: string;
  type: string;
  updateTime?: string;
  connectionInfo?: Record<string, string>;
  tables: TableauTable[];
  relations: TableauRelation[];
  fields: TableauField[];
}

export interface TableauMetadata {
  datasources: TableauDatasource[];
  parameters: TableauParameter[];
}

export function parseTableauMetadata(xmlString: string): TableauMetadata {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  const datasources: TableauDatasource[] = [];
  const parameters: TableauParameter[] = [];
  const globalFieldMap = new Map<string, string>(); // id -> name
  
  const dsElements = xmlDoc.querySelectorAll('workbook > datasources > datasource');
  
  // First pass: collect all fields and parameters for globalFieldMap
  dsElements.forEach(dsEl => {
    const name = dsEl.getAttribute('caption') || dsEl.getAttribute('name') || 'Unknown';
    const id = dsEl.getAttribute('name') || '';
    
    const columnEls = dsEl.querySelectorAll(':scope > column');
    columnEls.forEach(colEl => {
      const colId = colEl.getAttribute('name') || '';
      const colName = colEl.getAttribute('caption') || colId.replace(/^\[|\]$/g, '');
      if (colId) {
        globalFieldMap.set(colId, colName);
      }
    });

    const metadataRecords = dsEl.querySelectorAll('metadata-record[class="column"]');
    metadataRecords.forEach(mr => {
      const localName = mr.querySelector('local-name')?.textContent || '';
      const remoteName = mr.querySelector('remote-name')?.textContent || localName.replace(/^\[|\]$/g, '');
      if (localName && !globalFieldMap.has(localName)) {
        globalFieldMap.set(localName, remoteName);
      }
    });
    
    if (name === 'Parameters' || id === 'Parameters') {
      columnEls.forEach(colEl => {
        const colId = colEl.getAttribute('name') || '';
        const colName = colEl.getAttribute('caption') || colId.replace(/^\[|\]$/g, '');
        const dataType = colEl.getAttribute('datatype') || 'unknown';
        const value = colEl.getAttribute('value') || '';
        const domainType = colEl.getAttribute('param-domain-type') || 'all';
        
        let paramValue = value;
        if (!paramValue) {
          const calcEl = colEl.querySelector('calculation');
          if (calcEl) {
            paramValue = calcEl.getAttribute('formula') || '';
          }
        }
        
        const listValues: { value: string; alias?: string }[] = [];
        if (domainType === 'list') {
          const members = colEl.querySelectorAll('members > member');
          members.forEach(m => {
            listValues.push({
              value: m.getAttribute('value') || '',
              alias: m.getAttribute('alias') || undefined
            });
          });
        }
        
        let range: { min?: string; max?: string; step?: string } | undefined;
        if (domainType === 'range') {
          const rangeEl = colEl.querySelector('range');
          if (rangeEl) {
            range = {
              min: rangeEl.getAttribute('min') || undefined,
              max: rangeEl.getAttribute('max') || undefined,
              step: rangeEl.getAttribute('step') || undefined
            };
          }
        }
        
        parameters.push({
          id: colId,
          name: colName,
          dataType,
          value: paramValue,
          domainType,
          listValues: listValues.length > 0 ? listValues : undefined,
          range
        });
      });
    }
  });
  
  // Parse worksheets to find used fields
  const worksheetEls = xmlDoc.querySelectorAll('workbook > worksheets > worksheet');
  const usedFieldsByDatasource: Record<string, Record<string, string[]>> = {}; // dsName -> fieldName -> worksheetNames
  const fieldDefsFromViews: Record<string, Record<string, any>> = {}; // dsName -> fieldName -> def
  
  worksheetEls.forEach(wsEl => {
    const wsName = wsEl.getAttribute('name') || 'Unknown Worksheet';
    // Broaden selector to catch all datasource-dependencies, not just under table > view
    const dsDependencies = wsEl.querySelectorAll('datasource-dependencies');
    
    dsDependencies.forEach(dsDep => {
      const dsName = dsDep.getAttribute('datasource') || '';
      if (!usedFieldsByDatasource[dsName]) {
        usedFieldsByDatasource[dsName] = {};
        fieldDefsFromViews[dsName] = {};
      }
      
      const colInstances = dsDep.querySelectorAll('column-instance');
      colInstances.forEach(colInst => {
        const colName = colInst.getAttribute('column') || '';
        if (colName) {
          if (!usedFieldsByDatasource[dsName][colName]) {
            usedFieldsByDatasource[dsName][colName] = [];
          }
          if (!usedFieldsByDatasource[dsName][colName].includes(wsName)) {
            usedFieldsByDatasource[dsName][colName].push(wsName);
          }
        }
      });
      
      const cols = dsDep.querySelectorAll('column');
      cols.forEach(col => {
        const colName = col.getAttribute('name') || '';
        if (colName) {
          if (!usedFieldsByDatasource[dsName][colName]) {
            usedFieldsByDatasource[dsName][colName] = [];
          }
          if (!usedFieldsByDatasource[dsName][colName].includes(wsName)) {
            usedFieldsByDatasource[dsName][colName].push(wsName);
          }
          
          // Save field definition if we don't have it, as some fields ONLY appear in view dependencies
          if (!fieldDefsFromViews[dsName][colName]) {
            fieldDefsFromViews[dsName][colName] = {
              caption: col.getAttribute('caption') || colName.replace(/^\[|\]$/g, ''),
              datatype: col.getAttribute('datatype') || 'unknown',
              role: col.getAttribute('role') || 'dimension',
              type: col.getAttribute('type') || 'nominal',
              formula: col.querySelector('calculation')?.getAttribute('formula') || undefined
            };
          }
        }
      });
    });
  });
  
  dsElements.forEach(dsEl => {
    // Skip internal datasources like 'Parameters'
    const name = dsEl.getAttribute('caption') || dsEl.getAttribute('name') || 'Unknown';
    const id = dsEl.getAttribute('name') || '';
    
    if (name === 'Parameters' || id === 'Parameters') return;
    
    let type = 'Unknown';
    let connectionInfo: Record<string, string> | undefined = undefined;
    const connectionEl = dsEl.querySelector('connection');
    if (connectionEl) {
      type = connectionEl.getAttribute('class') || 'Unknown';
      let targetConnection = connectionEl;
      if (type === 'federated') {
        const namedConnection = connectionEl.querySelector('named-connections > named-connection > connection');
        if (namedConnection) {
          type = namedConnection.getAttribute('class') || type;
          targetConnection = namedConnection;
        }
      }
      
      connectionInfo = {};
      const attrs = ['server', 'dbname', 'filename', 'directory', 'port', 'username'];
      attrs.forEach(attr => {
        const val = targetConnection.getAttribute(attr);
        if (val) connectionInfo![attr] = val;
      });
      if (Object.keys(connectionInfo).length === 0) {
        connectionInfo = undefined;
      }
    }
    
    let updateTime = undefined;
    const extractEl = dsEl.querySelector('extract');
    if (extractEl) {
      const refreshEl = extractEl.querySelector('refresh');
      if (refreshEl) {
        updateTime = refreshEl.getAttribute('increment-key') || undefined;
      }
    }
    
    const tables: TableauTable[] = [];
    const relations: TableauRelation[] = [];

    // Parse logical tables (Tableau 2020.2+)
    const objectEls = dsEl.querySelectorAll('object-graph > objects > object');
    objectEls.forEach(obj => {
      const id = obj.getAttribute('id') || '';
      const caption = obj.getAttribute('caption') || id;
      let customSql = undefined;
      const textRelation = obj.querySelector('relation[type="text"]');
      if (textRelation) {
        customSql = textRelation.textContent?.trim() || undefined;
      }
      if (id) {
        tables.push({ id, name: caption.replace(/^\[|\]$/g, ''), customSql });
      }
    });

    const relEls = dsEl.querySelectorAll('object-graph > relationships > relationship');
    relEls.forEach(rel => {
      const firstEnd = rel.querySelector('first-end-point');
      const secondEnd = rel.querySelector('second-end-point');
      const left = firstEnd?.getAttribute('object-id') || '';
      const right = secondEnd?.getAttribute('object-id') || '';
      const leftType = firstEnd?.getAttribute('type') || undefined;
      const rightType = secondEnd?.getAttribute('type') || undefined;
      const expressionEl = rel.querySelector('expression');
      let expression = undefined;
      if (expressionEl) {
        const op = expressionEl.getAttribute('op');
        const children = expressionEl.querySelectorAll(':scope > expression');
        if (children.length === 2) {
           expression = `${children[0].getAttribute('op')} ${op} ${children[1].getAttribute('op')}`;
        } else {
           expression = op || undefined;
        }
      }
      if (left && right) {
        relations.push({ leftTable: left, rightTable: right, expression, leftType, rightType });
      }
    });

    // Fallback to physical tables if no logical tables found
    if (tables.length === 0) {
      const tableEls = dsEl.querySelectorAll('relation[type="table"]');
      tableEls.forEach(t => {
        const name = t.getAttribute('name') || '';
        const caption = t.getAttribute('caption') || name;
        if (name && !tables.find(tbl => tbl.id === name)) {
          tables.push({ id: name, name: caption.replace(/^\[|\]$/g, '') });
        }
      });
      
      const textEls = dsEl.querySelectorAll('relation[type="text"]');
      textEls.forEach(t => {
        const name = t.getAttribute('name') || '';
        const caption = t.getAttribute('caption') || name;
        const customSql = t.textContent?.trim() || undefined;
        if (name && !tables.find(tbl => tbl.id === name)) {
          tables.push({ id: name, name: caption.replace(/^\[|\]$/g, ''), customSql });
        }
      });

      const joinEls = dsEl.querySelectorAll('relation[type="join"]');
      joinEls.forEach(j => {
        const joinType = j.getAttribute('join') || 'inner';
        const children = j.querySelectorAll(':scope > relation');
        if (children.length >= 2) {
          const left = children[0].getAttribute('name') || '';
          const right = children[1].getAttribute('name') || '';
          const clause = j.querySelector('clause[type="join"] > expression');
          let expression = undefined;
          if (clause) {
            const op = clause.getAttribute('op');
            const exprs = clause.querySelectorAll(':scope > expression');
            if (exprs.length === 2) {
              expression = `${exprs[0].getAttribute('op')} ${op} ${exprs[1].getAttribute('op')}`;
            } else {
              expression = op || undefined;
            }
          }
          if (left && right) {
            relations.push({ leftTable: left, rightTable: right, joinType, expression });
          }
        }
      });
    }

    // Build fieldToTableMap
    const fieldToTableMap = new Map<string, string>();
    const metadataRecords = dsEl.querySelectorAll('metadata-record[class="column"]');
    metadataRecords.forEach(mr => {
      const localName = mr.querySelector('local-name')?.textContent || '';
      const parentName = mr.querySelector('parent-name')?.textContent || '';
      if (localName && parentName) {
        fieldToTableMap.set(localName, parentName.replace(/^\[|\]$/g, ''));
      }
    });

    const fields: TableauField[] = [];
    const columnEls = dsEl.querySelectorAll(':scope > column');
    
    // First pass: create all fields
    const fieldMap = new Map<string, TableauField>();
    const fieldNameMap = new Map<string, TableauField>();
    
    columnEls.forEach(colEl => {
      const colId = colEl.getAttribute('name') || '';
      const colName = colEl.getAttribute('caption') || colId.replace(/^\[|\]$/g, '');
      const dataType = colEl.getAttribute('datatype') || 'unknown';
      const role = colEl.getAttribute('role') || 'dimension';
      const colType = colEl.getAttribute('type') || 'nominal';
      
      const calcEl = colEl.querySelector('calculation');
      const isCalculated = !!calcEl && !!calcEl.getAttribute('formula');
      const formula = calcEl ? calcEl.getAttribute('formula') || undefined : undefined;
      
      const dependencies: string[] = [];
      if (formula) {
        // Remove comments (// ...)
        const formulaWithoutComments = formula.replace(/\/\/.*$/gm, '');
        // Extract [Field Name] from formula
        const regex = /\[([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(formulaWithoutComments)) !== null) {
          dependencies.push(`[${match[1]}]`);
        }
      }
      
      const usedInViews = usedFieldsByDatasource[id]?.[colId] ? [...usedFieldsByDatasource[id][colId]] : [];
      
      let tableName = fieldToTableMap.get(colId);
      if (!tableName && colId.includes('.')) {
        const parts = colId.split('.');
        if (parts.length > 1 && parts[0].startsWith('[')) {
          tableName = parts[0].replace(/^\[|\]$/g, '');
        }
      }
      if (tableName) {
        tableName = tableName.replace(/^\[|\]$/g, '');
      }

      const field: TableauField = {
        id: colId,
        name: colName,
        dataType,
        role,
        type: colType,
        isCalculated,
        formula,
        dependencies,
        usedInViews,
        tableName
      };
      
      fields.push(field);
      fieldMap.set(colId, field);
      fieldNameMap.set(`[${colName}]`, field);
    });

    // Add natural fields from metadata records that might not have a <column> element
    metadataRecords.forEach(mr => {
      const localName = mr.querySelector('local-name')?.textContent || '';
      if (localName && !fieldMap.has(localName)) {
        const remoteName = mr.querySelector('remote-name')?.textContent || localName.replace(/^\[|\]$/g, '');
        const localType = mr.querySelector('local-type')?.textContent || 'unknown';
        const parentName = mr.querySelector('parent-name')?.textContent || '';
        
        const dataType = localType;
        const role = (dataType === 'real' || dataType === 'integer') ? 'measure' : 'dimension';
        const colType = (dataType === 'real' || dataType === 'integer') ? 'quantitative' : 'nominal';
        let tableName = parentName ? parentName.replace(/^\[|\]$/g, '') : undefined;
        
        if (!tableName && localName.includes('.')) {
          const parts = localName.split('.');
          if (parts.length > 1 && parts[0].startsWith('[')) {
            tableName = parts[0].replace(/^\[|\]$/g, '');
          }
        }

        const usedInViews = usedFieldsByDatasource[id]?.[localName] ? [...usedFieldsByDatasource[id][localName]] : [];

        const field: TableauField = {
          id: localName,
          name: remoteName,
          dataType,
          role,
          type: colType,
          isCalculated: false,
          formula: undefined,
          dependencies: [],
          usedInViews,
          tableName
        };
        
        fields.push(field);
        fieldMap.set(localName, field);
        fieldNameMap.set(`[${remoteName}]`, field);
      }
    });

    // Add fields from worksheet dependencies that might not be in the main datasource definition
    if (fieldDefsFromViews[id]) {
      Object.entries(fieldDefsFromViews[id]).forEach(([colId, def]) => {
        if (!fieldMap.has(colId)) {
          const usedInViews = usedFieldsByDatasource[id]?.[colId] ? [...usedFieldsByDatasource[id][colId]] : [];
          
          let tableName = undefined;
          if (colId.includes('.')) {
            const parts = colId.split('.');
            if (parts.length > 1 && parts[0].startsWith('[')) {
              tableName = parts[0].replace(/^\[|\]$/g, '');
            }
          }

          const field: TableauField = {
            id: colId,
            name: def.caption,
            dataType: def.datatype,
            role: def.role,
            type: def.type,
            isCalculated: !!def.formula,
            formula: def.formula,
            dependencies: [], // Will be populated in pass 3 if calculated
            usedInViews,
            tableName
          };
          
          fields.push(field);
          fieldMap.set(colId, field);
          fieldNameMap.set(`[${def.caption}]`, field);
          globalFieldMap.set(colId, def.caption);
        }
      });
    }
    
    // Second pass: propagate usedInViews to dependencies
    let changed = true;
    while (changed) {
      changed = false;
      fields.forEach(field => {
        if (field.usedInViews.length > 0 && field.dependencies.length > 0) {
          field.dependencies.forEach(depId => {
            const depField = fieldMap.get(depId) || fieldNameMap.get(depId);
            if (depField) {
              const originalLength = depField.usedInViews.length;
              field.usedInViews.forEach(view => {
                if (!depField.usedInViews.includes(view)) {
                  depField.usedInViews.push(view);
                }
              });
              if (depField.usedInViews.length > originalLength) {
                changed = true;
              }
            }
          });
        }
      });
    }
    
    // Third pass: resolve formulas and dependencies to use names
    fields.forEach(field => {
      if (field.formula) {
        let readableFormula = field.formula;
        const newDependencies: string[] = [];
        
        field.dependencies.forEach(depId => {
          let resolvedName = depId.replace(/^\[|\]$/g, '');
          if (globalFieldMap.has(depId)) {
            resolvedName = globalFieldMap.get(depId)!;
            readableFormula = readableFormula.split(depId).join(`[${resolvedName}]`);
          }
          
          const depNameWithBrackets = `[${resolvedName}]`;
          
          if (!newDependencies.includes(depNameWithBrackets) && resolvedName !== 'Parameters') {
            newDependencies.push(depNameWithBrackets);
            
            // If this dependency is completely unknown, it's likely a natural field 
            // from the database that wasn't explicitly serialized. Let's create a stub for it.
            const isKnownField = fieldMap.has(depId) || fieldNameMap.has(depId) || fieldNameMap.has(depNameWithBrackets);
            const isParameter = parameters.some(p => p.id === depId || `[${p.name}]` === depNameWithBrackets);
            
            if (!isKnownField && !isParameter) {
              const directUsage = usedFieldsByDatasource[id]?.[depId] || [];
              const combinedUsage = Array.from(new Set([...field.usedInViews, ...directUsage]));

              const stubField: TableauField = {
                id: depId,
                name: resolvedName,
                dataType: 'unknown',
                role: 'dimension', // Default fallback
                type: 'nominal', // Default fallback
                isCalculated: false,
                formula: undefined,
                dependencies: [],
                usedInViews: combinedUsage,
                tableName: undefined // Unknown table
              };
              
              fields.push(stubField);
              fieldMap.set(depId, stubField);
              fieldNameMap.set(depNameWithBrackets, stubField);
              globalFieldMap.set(depId, resolvedName);
            }
          }
        });
        
        field.formula = readableFormula;
        field.dependencies = newDependencies;
      }
    });
    
    datasources.push({
      id,
      name,
      type,
      updateTime,
      connectionInfo,
      tables,
      relations,
      fields
    });
  });
  
  return { datasources, parameters };
}
