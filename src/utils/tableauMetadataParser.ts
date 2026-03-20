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
}

export interface TableauRelation {
  leftTable: string;
  rightTable: string;
}

export interface TableauDatasource {
  id: string;
  name: string;
  type: string;
  updateTime?: string;
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
  
  worksheetEls.forEach(wsEl => {
    const wsName = wsEl.getAttribute('name') || 'Unknown Worksheet';
    const dsDependencies = wsEl.querySelectorAll('table > view > datasource-dependencies');
    
    dsDependencies.forEach(dsDep => {
      const dsName = dsDep.getAttribute('datasource') || '';
      if (!usedFieldsByDatasource[dsName]) {
        usedFieldsByDatasource[dsName] = {};
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
    const connectionEl = dsEl.querySelector('connection');
    if (connectionEl) {
      type = connectionEl.getAttribute('class') || 'Unknown';
      if (type === 'federated') {
        const namedConnection = connectionEl.querySelector('named-connections > named-connection > connection');
        if (namedConnection) {
          type = namedConnection.getAttribute('class') || type;
        }
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
      if (id) {
        tables.push({ id, name: caption.replace(/^\[|\]$/g, '') });
      }
    });

    const relEls = dsEl.querySelectorAll('object-graph > relationships > relationship');
    relEls.forEach(rel => {
      const left = rel.querySelector('first-end-point')?.getAttribute('object-id') || '';
      const right = rel.querySelector('second-end-point')?.getAttribute('object-id') || '';
      if (left && right) {
        relations.push({ leftTable: left, rightTable: right });
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
          if (!newDependencies.includes(`[${resolvedName}]`) && resolvedName !== 'Parameters') {
            newDependencies.push(`[${resolvedName}]`);
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
      tables,
      relations,
      fields
    });
  });
  
  return { datasources, parameters };
}
