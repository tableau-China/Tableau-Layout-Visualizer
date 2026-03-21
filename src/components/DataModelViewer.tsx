import React, { useMemo, useEffect, useState } from 'react';
import { TableauMetadata, TableauDatasource, TableauTable, TableauRelation } from '../utils/tableauMetadataParser';
import { Database, Table2, ArrowRightLeft, Info, Server, FileText, Calendar } from 'lucide-react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom Node for Tableau Tables
const TableauTableNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-white border-2 border-blue-400 rounded-lg shadow-md min-w-[180px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500" />
      <div className="bg-blue-50 px-3 py-2 flex items-center gap-2 border-b border-blue-100">
        <Table2 className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-blue-900 truncate max-w-[150px]">{data.label as string}</span>
      </div>
      {data.customSql && (
        <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center border-t border-zinc-100">
          Custom SQL
        </div>
      )}
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500" />
    </div>
  );
};

const nodeTypes = {
  tableauTable: TableauTableNode,
};

// Layout function using Dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 220;
  const nodeHeight = 60;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const ERMarkers = () => (
  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
    <defs>
      {/* Many marker for target (end) */}
      <marker id="many-end" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M 0 0 L 10 6 L 0 12 M 10 0 L 10 12" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      </marker>
      {/* One marker for target (end) */}
      <marker id="one-end" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M 5 0 L 5 12 M 10 0 L 10 12" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      </marker>
      {/* Many marker for source (start) */}
      <marker id="many-start" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="2" refY="6" orient="auto">
        <path d="M 12 0 L 2 6 L 12 12 M 2 0 L 2 12" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      </marker>
      {/* One marker for source (start) */}
      <marker id="one-start" viewBox="0 0 12 12" markerWidth="12" markerHeight="12" refX="2" refY="6" orient="auto">
        <path d="M 2 0 L 2 12 M 7 0 L 7 12" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      </marker>
    </defs>
  </svg>
);

interface DatasourceGraphProps {
  ds: TableauDatasource;
}

const DatasourceGraph: React.FC<DatasourceGraphProps> = ({ ds }) => {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const initialNodes: Node[] = ds.tables.map((t) => ({
    id: t.id,
    type: 'tableauTable',
    data: { label: t.name, customSql: t.customSql },
    position: { x: 0, y: 0 },
  }));

  const initialEdges: Edge[] = ds.relations.map((rel, idx) => {
    const isManyLeft = rel.leftType === 'many';
    const isOneLeft = rel.leftType === 'one';
    const isManyRight = rel.rightType === 'many';
    const isOneRight = rel.rightType === 'one';

    const edgeId = `e-${rel.leftTable}-${rel.rightTable}-${idx}`;
    const isSelected = selectedEdgeId === edgeId;

    return {
      id: edgeId,
      source: rel.leftTable,
      target: rel.rightTable,
      label: rel.joinType ? `${rel.joinType.toUpperCase()} JOIN` : 'Relates',
      labelStyle: { fill: isSelected ? '#4f46e5' : '#6366f1', fontWeight: 600, fontSize: 10 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
      animated: isSelected,
      style: { 
        stroke: isSelected ? '#4f46e5' : '#94a3b8', 
        strokeWidth: isSelected ? 3 : 2,
        cursor: 'pointer'
      },
      markerStart: isManyLeft ? 'url(#many-start)' : isOneLeft ? 'url(#one-start)' : undefined,
      markerEnd: isManyRight ? 'url(#many-end)' : isOneRight ? 'url(#one-end)' : undefined,
      data: { relation: rel }
    };
  });

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges, selectedEdgeId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update layout if ds or selectedEdgeId changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(initialNodes, initialEdges);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [ds, selectedEdgeId]);

  const tablesWithSql = ds.tables.filter(t => t.customSql);
  const selectedRelation = selectedEdgeId ? ds.relations.find((_, idx) => `e-${ds.relations[idx].leftTable}-${ds.relations[idx].rightTable}-${idx}` === selectedEdgeId) : null;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
      <ERMarkers />
      <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
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
          <p className="text-sm text-zinc-500 mt-1">
            {ds.tables.length} Tables, {ds.relations.length} Relationships
          </p>
        </div>
      </div>

      {ds.tables.length > 0 && (
        <div className="flex flex-col lg:flex-row h-[500px] w-full border-b border-zinc-100">
          <div className="flex-1 bg-zinc-50/50 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
              onPaneClick={() => setSelectedEdgeId(null)}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
          
          {/* Right Sidebar for Meta Info & Edge Details */}
          <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-zinc-200 overflow-y-auto">
            <div className="p-5 space-y-6">
              
              {/* Datasource Meta Info */}
              <div>
                <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Datasource Info
                </h4>
                <div className="space-y-3">
                  {ds.connectionInfo && Object.entries(ds.connectionInfo).map(([key, value]) => {
                    if (!value) return null;
                    let Icon = Server;
                    if (key === 'filename' || key === 'dbname') Icon = FileText;
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{key}</span>
                        <div className="flex items-start gap-2 text-sm text-zinc-700 bg-zinc-50 p-2 rounded border border-zinc-100 break-all">
                          <Icon className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <span>{value}</span>
                        </div>
                      </div>
                    );
                  })}
                  {ds.updateTime && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Last Updated</span>
                      <div className="flex items-center gap-2 text-sm text-zinc-700 bg-zinc-50 p-2 rounded border border-zinc-100">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span>{ds.updateTime}</span>
                      </div>
                    </div>
                  )}
                  {(!ds.connectionInfo || Object.keys(ds.connectionInfo).length === 0) && !ds.updateTime && (
                    <p className="text-sm text-zinc-500 italic">No additional metadata available.</p>
                  )}
                </div>
              </div>

              {/* Selected Relationship Details */}
              {selectedRelation && (
                <div className="pt-5 border-t border-zinc-100">
                  <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                    Relationship Details
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-center">
                        <span className="text-xs font-bold text-indigo-900 block truncate">
                          {ds.tables.find(t => t.id === selectedRelation.leftTable)?.name || selectedRelation.leftTable}
                        </span>
                        <span className="text-[10px] text-indigo-600 uppercase tracking-wider">
                          {selectedRelation.leftType || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-center">
                        <span className="text-xs font-bold text-indigo-900 block truncate">
                          {ds.tables.find(t => t.id === selectedRelation.rightTable)?.name || selectedRelation.rightTable}
                        </span>
                        <span className="text-[10px] text-indigo-600 uppercase tracking-wider">
                          {selectedRelation.rightType || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {selectedRelation.joinType && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Join Type</span>
                        <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded border border-zinc-200">
                          {selectedRelation.joinType.toUpperCase()} JOIN
                        </span>
                      </div>
                    )}

                    {selectedRelation.expression && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Match Condition</span>
                        <div className="text-xs font-mono text-zinc-800 bg-zinc-50 p-2 rounded border border-zinc-200 overflow-x-auto whitespace-pre-wrap break-all">
                          ON {selectedRelation.expression}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!selectedRelation && (
                <div className="pt-5 border-t border-zinc-100">
                  <p className="text-sm text-zinc-500 italic text-center py-4">
                    Click on a relationship line to view its matching details.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {tablesWithSql.length > 0 && (
        <div className="p-6 bg-zinc-50/30">
          <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-blue-500" />
            Custom SQL Definitions
          </h4>
          <div className="space-y-6">
            {tablesWithSql.map(t => (
              <div key={t.id} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-zinc-100/50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">{t.name}</span>
                </div>
                <div className="text-sm">
                  <SyntaxHighlighter 
                    language="sql" 
                    style={vscDarkPlus} 
                    customStyle={{ margin: 0, padding: '1rem', borderRadius: 0, fontSize: '0.85rem' }}
                  >
                    {t.customSql || ''}
                  </SyntaxHighlighter>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface DataModelViewerProps {
  metadata: TableauMetadata | null;
}

export const DataModelViewer: React.FC<DataModelViewerProps> = ({ metadata }) => {
  if (!metadata || metadata.datasources.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-4xl mx-auto mt-8">
        <Database className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900">No Data Models Found</h3>
        <p className="text-zinc-500 mt-1">Upload a Tableau workbook to view its data models and relationships.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">Data Models</h2>
        <p className="text-zinc-500 mt-1">Visualize table relationships and Custom SQL definitions across all datasources.</p>
      </div>
      
      <div className="space-y-8">
        {metadata.datasources.map(ds => (
          <DatasourceGraph key={ds.id} ds={ds} />
        ))}
      </div>
    </div>
  );
};
