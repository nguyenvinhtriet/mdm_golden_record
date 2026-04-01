import React, { useState } from 'react';
import { entityMetadata } from '../metadata';
import { Network, Database, GitMerge, Save, FileJson, AlertCircle } from 'lucide-react';

const CONSOLIDATION_RULES = [
  'Prioritize Source A',
  'Prioritize Source B',
  'Most Recent Update',
  'Longest String',
  'Manual Review Required',
  'Coalesce (First Non-Null)'
];

export interface DataSource {
  id: string;
  name: string;
  columns: string[];
}

interface GoldenConfigTabProps {
  dataSources: DataSource[];
}

export const GoldenConfigTab: React.FC<GoldenConfigTabProps> = ({ dataSources }) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entityMetadata[0].id);
  
  // State to hold mappings: { [entityId]: { [columnId]: { [sourceId]: string, rule: string } } }
  const [mappings, setMappings] = useState<Record<string, any>>({});

  const selectedEntity = entityMetadata.find(e => e.id === selectedEntityId) || entityMetadata[0];

  const handleMappingChange = (colId: string, sourceId: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [selectedEntityId]: {
        ...(prev[selectedEntityId] || {}),
        [colId]: {
          ...(prev[selectedEntityId]?.[colId] || {}),
          [sourceId]: value
        }
      }
    }));
  };

  const handleRuleChange = (colId: string, rule: string) => {
    setMappings(prev => ({
      ...prev,
      [selectedEntityId]: {
        ...(prev[selectedEntityId] || {}),
        [colId]: {
          ...(prev[selectedEntityId]?.[colId] || {}),
          rule
        }
      }
    }));
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-14rem)]">
      {/* Header / Entity Selector */}
      <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Network className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-medium text-slate-900">Source-to-Entity Mapping</h2>
            <p className="text-sm text-slate-500 mt-1">Map transaction data sources to your canonical entity schema and define consolidation rules.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider pl-2">Target Entity:</label>
          <select 
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[250px]"
          >
            {entityMetadata.map(entity => (
              <option key={entity.id} value={entity.id}>{entity.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-1 shadow-lg relative flex flex-col flex-1 overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6">
          {dataSources.length === 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-sm">No Data Sources Found</p>
                <p className="text-xs mt-1 opacity-80">Upload a CSV file in the "Data Resolution" tab and assign it a Source Tag to see it here for mapping.</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 font-medium w-1/4">
                    <div className="flex items-center gap-2">
                      <Database size={14} />
                      Target: {selectedEntity.name}
                    </div>
                  </th>
                  {dataSources.map(source => (
                    <th key={source.id} className="px-4 py-4 font-medium border-l border-slate-200 w-1/4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <FileJson size={14} />
                        Source: {source.name}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-4 font-medium border-l border-slate-200 w-1/4">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <GitMerge size={14} />
                      Consolidation Rule
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedEntity.columns.map(col => {
                  const colMapping = mappings[selectedEntityId]?.[col.id] || {};
                  
                  return (
                    <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-100/50 transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {col.name}
                        {col.existsInGoldenRecord && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500" title="Included in Golden Record"></span>
                        )}
                      </td>
                      
                      {dataSources.map(source => (
                        <td key={source.id} className="px-4 py-3 border-l border-slate-100">
                          <select
                            value={colMapping[source.id] || ''}
                            onChange={(e) => handleMappingChange(col.id, source.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Ignore --</option>
                            {source.columns.map(sc => (
                              <option key={sc} value={sc}>{sc}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                      
                      <td className="px-4 py-3 border-l border-slate-100 bg-indigo-50/30">
                        <select
                          value={colMapping.rule || ''}
                          onChange={(e) => handleRuleChange(col.id, e.target.value)}
                          className="w-full bg-white border border-indigo-200 text-indigo-900 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="">-- Select Rule --</option>
                          {CONSOLIDATION_RULES.map(rule => (
                            <option key={rule} value={rule}>{rule}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
              <Save size={16} />
              Save Mapping Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
