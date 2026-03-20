import React, { useState } from 'react';
import { Upload, Download, Image as ImageIcon, Layout, FileJson, ArrowRight, ImageDown, Database, ListTree } from 'lucide-react';
import { parseDashboardLayout, DashboardLayout } from './utils/tableauDashboardParser';
import { parseTableauMetadata, TableauMetadata } from './utils/tableauMetadataParser';
import { generateExcalidrawJson } from './utils/excalidrawGenerator';
import { DashboardTree } from './components/DashboardTree';
import { SvgVisualizer } from './components/SvgVisualizer';
import { MetadataViewer } from './components/MetadataViewer';

export default function App() {
  const [dashboards, setDashboards] = useState<DashboardLayout[]>([]);
  const [metadata, setMetadata] = useState<TableauMetadata | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'layout' | 'data'>('layout');

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDashboards(parseDashboardLayout(content));
      setMetadata(parseTableauMetadata(content));
      setSelectedZoneId(null);
      setActiveTab('layout');
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.twb')) {
      processFile(file);
    } else {
      alert('Please upload a valid .twb file');
    }
  };

  const downloadExcalidraw = (dashboard: DashboardLayout) => {
    const json = generateExcalidrawJson(dashboard);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dashboard.name}_excalidraw.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = (dashboard: DashboardLayout) => {
    const svgElement = document.getElementById(`svg-dashboard-${dashboard.name.replace(/\s+/g, '-')}`);
    if (!svgElement) return;
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    // Set canvas size to match SVG viewBox
    canvas.width = dashboard.size.width;
    canvas.height = dashboard.size.height;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${dashboard.name}_layout.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Hero Section */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 mb-6">
              Tableau to Excalidraw <br className="hidden lg:block" />
              <span className="text-blue-600">Layout Converter</span>
            </h1>
            <p className="text-lg text-zinc-600 mb-10">
              Automatically extract dashboard layouts from your Tableau (.twb) files and convert them into editable Excalidraw prototypes in seconds. No manual drawing required.
            </p>
            
            {/* Upload Area */}
            <div 
              className={`max-w-xl mx-auto p-10 border-2 border-dashed rounded-2xl transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload your .twb file</h3>
                <p className="text-sm text-zinc-500 mb-6">Drag and drop your file here, or click to browse</p>
                <label className="cursor-pointer">
                  <span className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    Select File
                  </span>
                  <input type="file" accept=".twb" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section (Only visible when no dashboard is loaded) */}
      {dashboards.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <FileJson className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Parse XML</h3>
              <p className="text-zinc-600">We read your .twb file and extract the exact coordinates, sizes, and hierarchy of all layout containers.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Layout className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Visualize Layout</h3>
              <p className="text-zinc-600">Preview the 1:1 scale wireframe directly in your browser to verify the structure before downloading.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Export to Excalidraw</h3>
              <p className="text-zinc-600">Generate a ready-to-use Excalidraw JSON file. Import it to start designing your next iteration immediately.</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {dashboards.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-bold text-zinc-900">Analysis Results</h2>
              <div className="flex bg-zinc-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'layout' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4" /> Layout
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'data' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" /> Data & Fields
                  </div>
                </button>
              </div>
            </div>
            <button 
              onClick={() => {
                setDashboards([]);
                setMetadata(null);
                setSelectedZoneId(null);
              }}
              className="text-sm text-zinc-500 hover:text-zinc-900 underline"
            >
              Clear and upload another
            </button>
          </div>

          {activeTab === 'layout' && (
            <div className="space-y-12">
              {dashboards.map((db, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{db.name}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        Canvas Size: {db.size.width} × {db.size.height}px ({db.size.mode})
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => downloadImage(db)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap"
                      >
                        <ImageDown className="w-4 h-4" /> 
                        Download Image
                      </button>
                      <button 
                        onClick={() => downloadExcalidraw(db)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm whitespace-nowrap"
                      >
                        <Download className="w-4 h-4" /> 
                        Export to Excalidraw
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
                    {/* Left Column: Tree */}
                    <div className="p-6 lg:col-span-1 bg-white">
                      <h4 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-zinc-400" />
                        Container Hierarchy
                      </h4>
                      <div className="overflow-auto max-h-[600px] pr-2 custom-scrollbar">
                        {db.zones.length > 0 ? (
                          db.zones.map(zone => (
                            <DashboardTree 
                              key={zone.id} 
                              zone={zone} 
                              selectedZoneId={selectedZoneId}
                              onSelectZone={setSelectedZoneId}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500 italic">No zones found in this dashboard.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Column: Visualizer */}
                    <div className="p-6 lg:col-span-2 bg-zinc-50/30">
                      <h4 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-zinc-400" />
                        1:1 Visual Prototype
                      </h4>
                      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                        {db.zones.length > 0 ? (
                          <SvgVisualizer dashboard={db} selectedZoneId={selectedZoneId} />
                        ) : (
                          <div className="h-64 flex items-center justify-center text-zinc-400">
                            No layout data to visualize
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'data' && metadata && (
            <MetadataViewer metadata={metadata} />
          )}
        </div>
      )}
    </div>
  );
}
