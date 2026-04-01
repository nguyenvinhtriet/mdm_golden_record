import React, { useState } from 'react';
import { entityMetadata, EntityDomain } from '../metadata';
import { Database, CheckCircle2, Settings, Layers, ListFilter } from 'lucide-react';
import { cn } from '../App';

export const EntityConfigTab: React.FC = () => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(entityMetadata[0].id);

  const selectedEntity = entityMetadata.find(e => e.id === selectedEntityId) || entityMetadata[0];

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start h-[calc(100vh-14rem)]">
      {/* Sidebar: Entity List */}
      <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <Database size={18} className="text-slate-500" />
            Entity Domains
          </h2>
          <span className="bg-white border border-slate-200 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
            {entityMetadata.length}
          </span>
        </div>

        <div className="bg-white rounded-[24px] p-2 flex-1 shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[200px]">
          <div className="flex-1 overflow-y-auto space-y-2 p-2 custom-scrollbar">
            {entityMetadata.map((entity) => (
              <div
                key={entity.id}
                onClick={() => setSelectedEntityId(entity.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all group relative overflow-hidden cursor-pointer",
                  selectedEntityId === entity.id
                    ? "bg-slate-100 border-blue-600 shadow-sm"
                    : "bg-white border-transparent hover:border-blue-300"
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-slate-900 text-sm font-medium leading-tight">
                    {entity.name}
                  </span>
                  <span className="text-slate-500 text-xs line-clamp-2">
                    {entity.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Entity Configuration */}
      <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-6 h-full">
        <div className="bg-white rounded-[32px] border border-slate-200 p-1 shadow-lg relative flex flex-col flex-1 overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          ></div>

          <div className="sticky top-0 z-30 p-6 flex justify-between items-center bg-white/90 backdrop-blur-md rounded-t-[28px] border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Settings className="fill-blue-600 text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-slate-900">
                  {selectedEntity.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure columns, processes, and golden record inclusion.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="mb-6">
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {selectedEntity.description}
              </p>
            </div>

            <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Column Name</th>
                    <th className="px-4 py-3 font-medium border-l border-slate-200">Process / Source</th>
                    <th className="px-4 py-3 font-medium border-l border-slate-200">Data Classification</th>
                    <th className="px-4 py-3 font-medium border-l border-slate-200">Consolidation Method</th>
                    <th className="px-4 py-3 font-medium border-l border-slate-200 text-center">In Golden Record</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntity.columns.map((col) => (
                    <tr
                      key={col.id}
                      className="border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {col.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 border-l border-slate-100">
                        <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs">
                          {col.process}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 border-l border-slate-100">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            col.dataClassification.includes('PII') || col.dataClassification.includes('Confidential')
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          )}
                        >
                          {col.dataClassification}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 border-l border-slate-100 italic text-xs">
                        {col.consolidationMethod}
                      </td>
                      <td className="px-4 py-3 text-center border-l border-slate-100">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.existsInGoldenRecord}
                            readOnly
                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
