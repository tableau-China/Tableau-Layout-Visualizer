import React, { useState } from 'react';
import { Database, Clock, Type, Hash, Calendar, ToggleLeft, FileText, ChevronDown, ChevronRight, Link as LinkIcon, SlidersHorizontal, Calculator, AlignLeft, Activity, Network, Table2, ArrowRightLeft } from 'lucide-react';
import { TableauMetadata, TableauDatasource, TableauField, TableauParameter } from '../utils/tableauMetadataParser';

interface MetadataViewerProps {
  metadata: TableauMetadata;
}

export function MetadataViewer({ metadata }: MetadataViewerProps) {
  const [expandedDs, setExpandedDs] = useState<string | null>(
    metadata.datasources.length > 0 ? metadata.datasources[0].id : null
  );
  const [expandedParams, setExpandedParams] = useState(true);

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'string': return <Type className="w-4 h-4 text-blue-500" />;
      case 'integer':
      case 'real': return <Hash className="w-4 h-4 text-emerald-500" />;
      case 'date':
      case 'datetime': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Parameters Section */}
      {metadata.parameters && metadata.parameters.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div 
            className="p-6 border-b border-zinc-100 bg-fuchsia-50/30 flex items-center justify-between cursor-pointer hover:bg-fuchsia-50/50 transition-colors"
            onClick={() => setExpandedParams(!expandedParams)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Parameters ({metadata.parameters.length})</h3>
                <p className="text-sm text-zinc-500 mt-1">Global variables used across the dashboard.</p>
              </div>
            </div>
            <div className="text-zinc-400">
              {expandedParams ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
          
          {expandedParams && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {metadata.parameters.map(param => (
                <div key={param.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="shrink-0" title={`Data Type: ${param.dataType}`}>
                        {getDataTypeIcon(param.dataType)}
                      </div>
                      <span className="font-medium text-zinc-900 text-sm truncate">{param.name}</span>
                    </div>
                    {param.domainType && param.domainType !== 'all' && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded uppercase">
                        {param.domainType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-600 bg-zinc-50 p-2 rounded border border-zinc-100 truncate">
                    Value: {param.value || 'N/A'}
                  </div>
                  
                  {/* Show Allowable Values if List or Range */}
                  {param.domainType === 'list' && param.listValues && (
                    <div className="mt-1">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">List Values</div>
                      <div className="flex flex-wrap gap-1">
                        {param.listValues.slice(0, 5).map((v, i) => (
                          <span key={i} className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200" title={v.alias || v.value}>
                            {v.alias || v.value}
                          </span>
                        ))}
                        {param.listValues.length > 5 && (
                          <span className="text-[10px] text-zinc-500 px-1">+{param.listValues.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {param.domainType === 'range' && param.range && (
                    <div className="mt-1">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">Range</div>
                      <div className="text-[11px] text-zinc-700 flex items-center gap-2">
                        {param.range.min !== undefined && <span>Min: <strong>{param.range.min}</strong></span>}
                        {param.range.max !== undefined && <span>Max: <strong>{param.range.max}</strong></span>}
                        {param.range.step !== undefined && <span>Step: <strong>{param.range.step}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Datasources Section */}
      {metadata.datasources.map((ds) => {
        const isExpanded = expandedDs === ds.id;
        
        const naturalFields = ds.fields.filter(f => !f.isCalculated).sort((a, b) => b.usedInViews.length - a.usedInViews.length);
        const calculatedFields = ds.fields.filter(f => f.isCalculated).sort((a, b) => b.usedInViews.length - a.usedInViews.length);

        return (
          <div key={ds.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Datasource Header */}
            <div 
              className="p-6 border-b border-zinc-100 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => setExpandedDs(isExpanded ? null : ds.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    {ds.name}
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-full font-medium">
                      {ds.type}
                    </span>
                  </h3>
                  {ds.updateTime && (
                    <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last Updated: {ds.updateTime}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-zinc-400">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>

            {/* Fields Content */}
            {isExpanded && (
              <div className="p-6 bg-zinc-50/50">
                <div className="space-y-8">
                  {/* Natural Fields */}
                  <div>
                    <h5 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
                      <AlignLeft className="w-5 h-5 text-emerald-500" />
                      Natural Fields ({naturalFields.length})
                    </h5>
                    
                    {/* Group by Table */}
                    {(() => {
                      const grouped: Record<string, TableauField[]> = {};
                      const ungrouped: TableauField[] = [];
                      
                      naturalFields.forEach(f => {
                        if (f.tableName) {
                          if (!grouped[f.tableName]) grouped[f.tableName] = [];
                          grouped[f.tableName].push(f);
                        } else {
                          ungrouped.push(f);
                        }
                      });

                      return (
                        <div className="space-y-6">
                          {Object.entries(grouped).map(([tableName, fields]) => (
                            <div key={tableName} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                              <h6 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-2 border-b border-zinc-100 pb-2">
                                <Table2 className="w-4 h-4 text-zinc-500" />
                                {tableName} <span className="text-xs font-normal text-zinc-500">({fields.length} fields)</span>
                              </h6>
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                                {fields.map(field => (
                                  <FieldCard 
                                    key={field.id} 
                                    field={field} 
                                    getDataTypeIcon={getDataTypeIcon} 
                                    allFields={ds.fields}
                                    parameters={metadata.parameters || []}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}

                          {ungrouped.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                              <h6 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-2 border-b border-zinc-100 pb-2">
                                <FileText className="w-4 h-4 text-zinc-500" />
                                Other Fields <span className="text-xs font-normal text-zinc-500">({ungrouped.length} fields)</span>
                              </h6>
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                                {ungrouped.map(field => (
                                  <FieldCard 
                                    key={field.id} 
                                    field={field} 
                                    getDataTypeIcon={getDataTypeIcon} 
                                    allFields={ds.fields}
                                    parameters={metadata.parameters || []}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Calculated Fields */}
                  <div>
                    <h5 className="text-base font-bold text-zinc-900 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-purple-500" />
                      Calculated Fields ({calculatedFields.length})
                    </h5>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                      {calculatedFields.map(field => (
                        <FieldCard 
                          key={field.id} 
                          field={field} 
                          getDataTypeIcon={getDataTypeIcon} 
                          allFields={ds.fields}
                          parameters={metadata.parameters || []}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {metadata.datasources.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200">
          <Database className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900">No Datasources Found</h3>
          <p className="text-zinc-500 mt-1">This dashboard doesn't seem to contain any data source definitions.</p>
        </div>
      )}
    </div>
  );
}

interface FieldCardProps {
  field: TableauField; 
  getDataTypeIcon: (type: string) => React.ReactNode;
  allFields: TableauField[];
  parameters: TableauParameter[];
}

const FieldCard: React.FC<FieldCardProps> = ({ field, getDataTypeIcon, allFields, parameters }) => {
  const [expanded, setExpanded] = useState(false);
  const refCount = field.usedInViews.length;

  const isContinuous = field.type === 'quantitative';
  const typeColor = isContinuous ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200';
  const typeText = isContinuous ? 'Continuous' : 'Discrete';

  return (
    <div className={`bg-white rounded-xl border ${expanded ? 'border-blue-300 shadow-md ring-1 ring-blue-100' : 'border-zinc-200 shadow-sm hover:border-blue-200'} transition-all overflow-hidden`}>
      <div
        className="p-3 flex items-start justify-between gap-3 cursor-pointer bg-white hover:bg-zinc-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 mt-0.5" title={`Data Type: ${field.dataType}`}>
            {getDataTypeIcon(field.dataType)}
          </div>
          <div className="truncate">
            <span className="font-semibold text-zinc-900 text-sm truncate block">
              {field.name}
            </span>
            <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
              <Activity className="w-3 h-3" />
              {refCount > 0 ? `Referenced ${refCount} times` : 'Not used in views'}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider border ${typeColor}`}>
            {typeText}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full uppercase tracking-wider border border-zinc-200">
            {field.role}
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
          {refCount > 0 && (
            <div>
              <h6 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">Used In Worksheets</h6>
              <div className="flex flex-wrap gap-1.5">
                {field.usedInViews.map(view => (
                  <span key={view} className="text-[11px] bg-white border border-zinc-200 text-zinc-600 px-2 py-1 rounded-md shadow-sm">
                    {view}
                  </span>
                ))}
              </div>
            </div>
          )}

          {field.isCalculated && field.formula && (
            <div>
              <h6 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">Calculation Logic</h6>
              <div className="text-xs font-mono text-zinc-800 bg-white p-3 rounded-lg border border-zinc-200 overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                {field.formula}
              </div>
            </div>
          )}

          {field.isCalculated && field.dependencies.length > 0 && (
            <div>
              <h6 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">Dependencies</h6>
              <div className="space-y-2">
                {field.dependencies.map(dep => (
                  <DependencyNode
                    key={dep}
                    depName={dep}
                    allFields={allFields}
                    parameters={parameters}
                    getDataTypeIcon={getDataTypeIcon}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DependencyNodeProps {
  depName: string;
  allFields: TableauField[];
  parameters: TableauParameter[];
  getDataTypeIcon: (type: string) => React.ReactNode;
}

const DependencyNode: React.FC<DependencyNodeProps> = ({ depName, allFields, parameters, getDataTypeIcon }) => {
  const [expanded, setExpanded] = useState(false);

  const field = allFields.find(f => `[${f.name}]` === depName || f.id === depName);
  const param = parameters.find(p => `[${p.name}]` === depName || p.id === depName);

  if (param) {
    return (
      <div className="bg-white border border-fuchsia-200 rounded-lg p-2.5 shadow-sm flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-fuchsia-500" />
          <span className="text-xs font-semibold text-zinc-900">{param.name}</span>
          <span className="text-[10px] bg-fuchsia-100 text-fuchsia-700 px-1.5 py-0.5 rounded-full">Parameter</span>
        </div>
        <div className="text-xs font-mono text-zinc-600 bg-zinc-50 p-1.5 rounded border border-zinc-100 truncate">
          Value: {param.value || 'N/A'}
        </div>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg p-2.5 shadow-sm flex items-center gap-2 text-zinc-500 text-xs">
        <LinkIcon className="w-3.5 h-3.5" />
        {depName} (Unknown Field)
      </div>
    );
  }

  const isExpandable = field.isCalculated && field.formula;
  const isContinuous = field.type === 'quantitative';
  const typeColor = isContinuous ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200';
  const typeText = isContinuous ? 'Continuous' : 'Discrete';

  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
      <div
        className={`p-2.5 flex items-center justify-between gap-2 ${isExpandable ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="shrink-0" title={`Data Type: ${field.dataType}`}>
            {getDataTypeIcon(field.dataType)}
          </div>
          <span className="text-xs font-semibold text-zinc-900 truncate">{field.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {field.isCalculated ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Calculated
              </span>
            ) : (
              <>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${typeColor}`}>
                  {typeText}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 capitalize">
                  {field.role}
                </span>
              </>
            )}
          </div>
        </div>
        {isExpandable && (
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </div>

      {expanded && field.isCalculated && field.formula && (
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
          <div>
            <div className="text-[11px] font-mono text-zinc-800 bg-white p-2 rounded border border-zinc-200 overflow-x-auto whitespace-pre-wrap break-all">
              {field.formula}
            </div>
          </div>
          {field.dependencies.length > 0 && (
            <div className="pl-2 border-l-2 border-zinc-200 space-y-2">
              {field.dependencies.map(dep => (
                <DependencyNode
                  key={dep}
                  depName={dep}
                  allFields={allFields}
                  parameters={parameters}
                  getDataTypeIcon={getDataTypeIcon}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
