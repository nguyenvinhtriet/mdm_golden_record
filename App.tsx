/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { CsvRow, ConflictCase, ProcessedResult } from './types';
import { LogTerminal } from './components/LogTerminal';
import { Zap, Play, Upload, Database, Layers, FileJson, Terminal, ArrowRight, CheckCircle2, AlertCircle, Save, Settings, SlidersHorizontal, Download, BookOpen } from 'lucide-react';
import * as fuzzball from 'fuzzball';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { EntityConfigTab } from './components/EntityConfigTab';
import { GoldenConfigTab } from './components/GoldenConfigTab';
import { GuidelineTab } from './components/GuidelineTab';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { exampleCsvData } from './exampleData';

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
};

const normalizeRow = (row: CsvRow): CsvRow => {
  return {
    ...row,
    first_name: row.first_name?.trim(),
    last_name: row.last_name?.trim(),
    email: row.email?.trim().toLowerCase(),
    phone: normalizePhone(row.phone || ''),
    state: row.state?.trim().toUpperCase(),
  };
};

const applySurvivorship = (rows: CsvRow[], cols: string[]) => {
  const draft: Record<string, string> = {};
  cols.forEach(col => {
    const values = rows.map(r => String(r[col] || '').trim()).filter(v => v && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'n/a');
    if (values.length === 0) {
      draft[col] = '';
      return;
    }
    
    if (col === 'address') {
      draft[col] = values.reduce((a, b) => a.length > b.length ? a : b);
    } else if (col === 'email') {
      draft[col] = values.reduce((a, b) => a.length > b.length ? a : b);
    } else if (col === 'phone') {
      draft[col] = values.reduce((a, b) => a.replace(/\D/g, '').length > b.replace(/\D/g, '').length ? a : b);
    } else {
      draft[col] = values.reduce((a, b) => a.length > b.length ? a : b);
    }
  });
  return draft;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'resolution' | 'config' | 'golden_config' | 'guideline'>('resolution');
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [groupingColumn, setGroupingColumn] = useState<string>('customer_id');
  
  const [dataSourceName, setDataSourceName] = useState<string>('System A');
  const [dataSources, setDataSources] = useState<{id: string, name: string, columns: string[]}[]>([]);
  const [goldenRecords, setGoldenRecords] = useState<Record<string, string>[]>([]);

  const [queue, setQueue] = useState<ConflictCase[]>([]);
  const [resolutionHistory, setResolutionHistory] = useState<ProcessedResult[]>([]);
  
  const [processedCount, setProcessedCount] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);

  const [showFinalModal, setShowFinalModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(60);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [finalRecord, setFinalRecord] = useState<Record<string, string> | null>(null);
  const [finalizingResultId, setFinalizingResultId] = useState<string | null>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

  const queueRef = useRef<ConflictCase[]>([]);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollY, innerHeight } = window;
      const { scrollHeight } = document.documentElement;
      const isAtBottom = scrollHeight - (scrollY + innerHeight) < 150;
      isAtBottomRef.current = isAtBottom;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      const timeoutId = setTimeout(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [resolutionHistory]);

  const recalculateConflicts = async (data: CsvRow[], groupCol: string) => {
    const conflicts = await findDuplicates(data, groupCol, fuzzyThreshold);
    setQueue(conflicts);
    
    const displayColumns = ['customer_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'date_of_birth', 'job_title'];

    const initialHistory: ProcessedResult[] = conflicts.map(c => {
        const draftRecord = applySurvivorship(c.rows, displayColumns);
        const fieldConflicts: Record<string, boolean> = {};

        displayColumns.forEach(col => {
            const values = c.rows.map(r => String(r[col] || '').trim()).filter(v => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'n/a');
            const uniqueValues = Array.from(new Set(values));
            fieldConflicts[col] = uniqueValues.length > 1;
        });

        return {
            id: c.id,
            input: c,
            output: draftRecord,
            logs: ["System applied Survivorship Rules (Longest string, E.164 phone, etc.)"],
            durationMs: 0,
            status: 'pending',
            draftRecord,
            conflicts: fieldConflicts
        };
    });
    
    setResolutionHistory(initialHistory);
    setProcessedCount(0);
    setAvgLatency(0);
    setSelectedConflictId(initialHistory.length > 0 ? initialHistory[0].id : null);
  };

  const processCsvData = async (data: CsvRow[], cols: string[]) => {
    const normalizedData = data.map(normalizeRow);
    setCsvData(normalizedData);
    
    const possibleCols = ['customer_id', 'id', 'email', 'phone', 'name'];
    const detectedCol = cols.find(c => possibleCols.includes(c.toLowerCase()));
    const initialGroupCol = detectedCol || (cols.length > 0 ? cols[0] : 'customer_id');
    setGroupingColumn(initialGroupCol);

    await recalculateConflicts(normalizedData, initialGroupCol);
  };

  const handleGroupingColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCol = e.target.value;
    setGroupingColumn(newCol);
    recalculateConflicts(csvData, newCol);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const cols = results.meta.fields || [];
        setColumns(cols);
        
        setDataSources(prev => {
          const existing = prev.find(s => s.name === dataSourceName);
          if (existing) return prev.map(s => s.name === dataSourceName ? { ...s, columns: cols } : s);
          return [...prev, { id: `src_${Date.now()}`, name: dataSourceName, columns: cols }];
        });

        const rows: CsvRow[] = data.map((row, idx) => ({
          _id: `row-${idx}`,
          ...row
        }));
        processCsvData(rows, cols);
      }
    });
  };

  const loadExampleData = async () => {
    try {
      Papa.parse(exampleCsvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const cols = results.meta.fields || [];
          setColumns(cols);
          setDataSourceName('Example Data');
          
          setDataSources(prev => {
            const existing = prev.find(s => s.name === 'Example Data');
            if (existing) return prev.map(s => s.name === 'Example Data' ? { ...s, columns: cols } : s);
            return [...prev, { id: `src_example`, name: 'Example Data', columns: cols }];
          });

          const rows: CsvRow[] = data.map((row, idx) => ({
            _id: `row-${idx}`,
            ...row
          }));
          processCsvData(rows, cols);
        }
      });
    } catch (error) {
      console.error("Error loading example data:", error);
      alert("Could not load example data. Please upload a file manually.");
    }
  };

  const findDuplicates = async (data: CsvRow[], groupColumn: string, threshold: number) => {
    const conflicts: ConflictCase[] = [];
    let conflictIdCounter = 0;

    // 1. Exact Match on ID
    const idGroups: Record<string, CsvRow[]> = {};
    data.forEach(row => {
      const key = String(row[groupColumn] || '').trim();
      if (!key) return;
      if (!idGroups[key]) idGroups[key] = [];
      idGroups[key].push(row);
    });

    Object.entries(idGroups).forEach(([key, rows]) => {
      if (rows.length > 1) {
        conflicts.push({
          id: `conflict-${conflictIdCounter++}`,
          groupKey: `Exact ${groupColumn}: ${key}`,
          rows
        });
      }
    });

    // Remove rows already in exact ID conflicts to avoid double counting
    const rowsInExactConflicts = new Set(conflicts.flatMap(c => c.rows.map(r => r._id)));
    const remainingRows = data.filter(r => !rowsInExactConflicts.has(r._id));

    // 2. Fuzzy Composite Match (FirstName + LastName) AND (ZipCode OR Email)
    const fuzzyGroups: CsvRow[][] = [];
    const processedRows = new Set<string>();

    for (let i = 0; i < remainingRows.length; i++) {
        const rowA = remainingRows[i];
        if (processedRows.has(rowA._id)) continue;

        const currentGroup = [rowA];
        processedRows.add(rowA._id);

        const nameA = `${rowA['first_name'] || ''} ${rowA['last_name'] || ''}`.toLowerCase().trim();
        const zipA = String(rowA['zip'] || '').trim();
        const emailA = String(rowA['email'] || '').toLowerCase().trim();

        if (!nameA) continue;

        for (let j = i + 1; j < remainingRows.length; j++) {
            const rowB = remainingRows[j];
            if (processedRows.has(rowB._id)) continue;

            const nameB = `${rowB['first_name'] || ''} ${rowB['last_name'] || ''}`.toLowerCase().trim();
            const zipB = String(rowB['zip'] || '').trim();
            const emailB = String(rowB['email'] || '').toLowerCase().trim();

            if (!nameB) continue;

            const nameRatio = fuzzball.ratio(nameA, nameB);
            const isZipMatch = zipA && zipB && zipA === zipB;
            const isEmailMatch = emailA && emailB && emailA === emailB;

            // If email matches exactly, we can be more lenient on the name
            const isStrongEmailMatch = isEmailMatch && nameRatio >= threshold;
            // If only zip matches, we need a stronger name match (e.g., threshold + 20)
            const isStrongZipMatch = isZipMatch && nameRatio >= Math.min(100, threshold + 20);

            if (isStrongEmailMatch || isStrongZipMatch) {
                currentGroup.push(rowB);
                processedRows.add(rowB._id);
            }
        }

        if (currentGroup.length > 1) {
            fuzzyGroups.push(currentGroup);
        }

        if (i % 10 === 0) {
            setProcessingProgress(Math.round((i / remainingRows.length) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    fuzzyGroups.forEach((rows, idx) => {
        const name = `${rows[0]['first_name'] || ''} ${rows[0]['last_name'] || ''}`.trim();
        conflicts.push({
            id: `conflict-${conflictIdCounter++}`,
            groupKey: `Fuzzy Match: ${name}`,
            rows
        });
    });

    setProcessingProgress(null);
    return conflicts;
  };

  const handleFieldSelect = (resultId: string, field: string, value: string) => {
      setResolutionHistory(prev => prev.map(r => {
          if (r.id === resultId) {
              return {
                  ...r,
                  draftRecord: {
                      ...r.draftRecord,
                      [field]: value
                  }
              };
          }
          return r;
      }));
  };

  const handleFinalize = (result: ProcessedResult) => {
      setFinalRecord(result.draftRecord || null);
      setFinalizingResultId(result.id);
      setShowFinalModal(true);
  };

  const handleApprove = () => {
      if (!finalizingResultId || !finalRecord) return;

      const resultToApprove = resolutionHistory.find(r => r.id === finalizingResultId);
      if (resultToApprove) {
          // Update CSV data: remove old rows, add new golden record
          setCsvData(prevData => {
              const oldRowIds = new Set(resultToApprove.input.rows.map(r => r._id));
              const newData = prevData.filter(row => !oldRowIds.has(row._id));
              
              // Create a new row with a unique ID
              const newRow: CsvRow = {
                  _id: `golden-${Date.now()}`,
                  ...finalRecord
              };
              newData.push(newRow);
              return newData;
          });

          // Add to golden records
          setGoldenRecords(prev => [...prev, finalRecord]);

          // Mark as resolved in history
          setResolutionHistory(prev => {
              const newHistory = prev.map(r => {
                  if (r.id === finalizingResultId) {
                      return { ...r, status: 'resolved' as const };
                  }
                  return r;
              });
              
              // Find next pending conflict
              const nextPending = newHistory.find(r => r.status !== 'resolved');
              if (nextPending) {
                  setSelectedConflictId(nextPending.id);
              } else {
                  setSelectedConflictId(null);
              }
              
              return newHistory;
          });
      }

      console.log("Approved Golden Record:", finalRecord);
      setShowFinalModal(false);
      setFinalRecord(null);
      setFinalizingResultId(null);
  };

  const exportGoldenRecords = () => {
    if (goldenRecords.length === 0) return;
    const csv = Papa.unparse(goldenRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'golden_records.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestResult = resolutionHistory.length > 0 ? resolutionHistory[resolutionHistory.length - 1] : null;

  const displayColumns = ['customer_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'date_of_birth', 'job_title'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 font-sans">
      
      <header className="max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-center pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
            <Layers className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-normal text-slate-900 tracking-tight">
              Golden Record Mastering
            </h1>
            <p className="text-slate-500 text-sm mt-1 max-w-3xl">
              Upload a CSV, identify duplicates via exact and fuzzy matching, and interactively build a Golden Record.
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6 md:mt-0 items-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white">
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Source Tag:</label>
            <input 
              type="text" 
              value={dataSourceName} 
              onChange={(e) => setDataSourceName(e.target.value)}
              className="bg-transparent text-slate-900 text-sm focus:outline-none w-24"
              placeholder="e.g. CRM"
            />
          </div>
          {columns.length > 0 && activeTab === 'resolution' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">Primary Key:</label>
              <select 
                value={groupingColumn} 
                onChange={handleGroupingColumnChange}
                className="bg-transparent text-slate-900 text-sm focus:outline-none cursor-pointer"
              >
                {columns.map(col => (
                  <option key={col} value={col} className="bg-white">{col}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={loadExampleData}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium tracking-wide uppercase cursor-pointer"
          >
            Load Example Data
          </button>
          
          <label className="flex items-center gap-2 px-6 py-3 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors text-sm font-medium tracking-wide uppercase cursor-pointer">
            <Upload size={18} />
            Upload CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>

          <button 
            onClick={exportGoldenRecords}
            disabled={goldenRecords.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium tracking-wide uppercase cursor-pointer"
          >
            <Download size={18} />
            Export ({goldenRecords.length})
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('resolution')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
            activeTab === 'resolution' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Database size={16} />
          Data Resolution
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
            activeTab === 'config' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <SlidersHorizontal size={16} />
          Entity Configuration
        </button>
        <button
          onClick={() => setActiveTab('golden_config')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
            activeTab === 'golden_config' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <Database size={16} />
          Golden Configuration
        </button>
        <button
          onClick={() => setActiveTab('guideline')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap",
            activeTab === 'guideline' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          <BookOpen size={16} />
          Guideline & Behind the Scenes
        </button>
      </div>

      <main className="max-w-[1600px] mx-auto">
        {activeTab === 'resolution' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <section className="lg:col-span-3 flex flex-col gap-6 lg:sticky lg:top-6 lg:h-[calc(100vh-14rem)]">
              <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="flex justify-between items-center px-2">
                      <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                          <Database size={18} className="text-slate-500"/> 
                          Conflict Clusters
                      </h2>
                      {processingProgress !== null ? (
                          <span className="text-blue-600 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                              Processing {processingProgress}%
                          </span>
                      ) : (
                          <span className="bg-white border border-slate-200 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">{resolutionHistory.length}</span>
                      )}
                  </div>
                  
                  <div className="bg-white rounded-[24px] p-2 flex-1 shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[200px]">
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 custom-scrollbar">
                      {resolutionHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Database size={32} className="opacity-20 mb-3" />
                          <span className="italic text-sm">No conflicts found</span>
                        </div>
                      )}
                      {resolutionHistory.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedConflictId(item.id)}
                          className={cn("p-4 rounded-xl border transition-all group relative overflow-hidden cursor-pointer",
                            selectedConflictId === item.id ? "bg-slate-100 border-blue-600" : "bg-white border-transparent hover:border-blue-300"
                          )}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-blue-600 text-[10px] font-mono tracking-wider truncate mr-2">{item.input.groupKey}</span>
                            <span className="text-slate-400 text-[10px] shrink-0">{item.input.rows.length} rows</span>
                       </div>
                       <div className="mt-2 flex justify-between items-center">
                         <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider",
                           item.status === 'resolved' ? 'bg-green-100 text-green-700' :
                           item.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                           item.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                           'bg-slate-200 text-slate-500'
                         )}>
                           {item.status}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
           </div>

           <div className="h-[300px] shrink-0 flex flex-col gap-2">
               <h2 className="text-sm font-medium text-slate-500 px-2 flex items-center gap-2">
                  <Terminal size={14}/> Live Output Log
               </h2>
               <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                  <LogTerminal 
                    logs={latestResult ? latestResult.logs : []} 
                    type="flash" 
                  />
               </div>
           </div>
        </section>

        <section className="lg:col-span-9 flex flex-col gap-6">
          <div className="bg-white rounded-[32px] border border-slate-200 p-1 shadow-lg relative flex flex-col min-h-[calc(100vh-10rem)]">
             <div className="absolute inset-0 opacity-5 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
             </div>

             <div className="sticky top-0 z-30 p-6 flex justify-between items-center bg-white/90 backdrop-blur-md rounded-t-[28px] border-b border-slate-200">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Zap className="fill-blue-600 text-blue-600" size={20} />
                   </div>
                   <div>
                       <h2 className="text-lg font-medium text-slate-900">Data Steward Workspace</h2>
                       <p className="text-xs text-slate-500">Interactively resolve conflicts to build a Golden Record.</p>
                   </div>
                </div>
             </div>

             <div className="relative z-10 p-6 pb-20">
                {resolutionHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[600px] opacity-50">
                        <Layers size={80} className="mb-4 text-blue-400" />
                        <p className="text-xl text-slate-600">System Idle</p>
                        <p className="text-sm mt-2 text-slate-500">Load example data or upload a CSV to begin mastering.</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {resolutionHistory.filter(r => r.id === selectedConflictId).map((result) => {
                          const isReadyToFinalize = displayColumns.every(col => result.draftRecord && result.draftRecord[col] !== undefined);

                          return (
                            <div 
                                key={result.id} 
                                className="transition-all duration-700 ease-in-out opacity-100 scale-100"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-blue-600">{result.input.groupKey}</h3>
                                    {result.status === 'resolved' && (
                                        <span className="flex items-center gap-2 text-green-600 text-xs font-bold uppercase tracking-wider">
                                            <CheckCircle2 size={14} />
                                            Resolved
                                        </span>
                                    )}
                                </div>

                                <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Field</th>
                                                {result.input.rows.map((_, i) => (
                                                    <th key={i} className="px-4 py-3 font-medium border-l border-slate-200">Record {i + 1}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayColumns.map((col) => {
                                                const hasConflict = result.conflicts?.[col];
                                                return (
                                                    <tr key={col} className="border-b border-slate-100 hover:bg-slate-100/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                                                            {col}
                                                            {hasConflict && <AlertCircle size={14} className="text-amber-500" />}
                                                        </td>
                                                        {result.input.rows.map((row, i) => {
                                                            const val = String(row[col] || '').trim();
                                                            const isSelected = result.draftRecord?.[col] === val && val !== '';
                                                            const isNullLike = val === '' || val === 'NULL' || val === 'None' || val === 'null' || val === 'n/a' || val === 'NA';

                                                            return (
                                                                <td key={i} className={cn("px-4 py-3 border-l border-slate-200", hasConflict ? "bg-amber-50" : "")}>
                                                                    {!isNullLike ? (
                                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                                            <input 
                                                                                type="radio" 
                                                                                name={`${result.id}-${col}`}
                                                                                checked={isSelected}
                                                                                onChange={() => handleFieldSelect(result.id, col, val)}
                                                                                className="w-4 h-4 text-blue-600 bg-white border-slate-300 focus:ring-blue-500 focus:ring-2"
                                                                            />
                                                                            <span className={cn("break-all", isSelected ? "text-blue-700 font-medium" : "text-slate-600 group-hover:text-slate-900")}>
                                                                                {val}
                                                                            </span>
                                                                        </label>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic text-xs">Empty</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-blue-800 flex items-center gap-2">
                                            <CheckCircle2 size={20} />
                                            Draft Golden Record
                                        </h4>
                                        <button
                                            onClick={() => handleFinalize(result)}
                                            disabled={!isReadyToFinalize}
                                            className={cn("flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium tracking-wide uppercase transition-all shadow-sm",
                                                isReadyToFinalize 
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20" 
                                                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                            )}
                                        >
                                            <Save size={16} />
                                            Finalize Golden Record
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {displayColumns.map(col => (
                                            <div key={col} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{col}</div>
                                                <div className={cn("text-sm font-mono break-all", result.draftRecord?.[col] ? "text-slate-800" : "text-slate-400 italic")}>
                                                    {result.draftRecord?.[col] || 'Pending selection...'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-12 border-b border-slate-200 w-full"></div>
                            </div>
                          );
                        })}
                    </div>
                )}
             </div>

          </div>
        </section>
        </div>
        ) : activeTab === 'config' ? (
          <EntityConfigTab />
        ) : activeTab === 'golden_config' ? (
          <GoldenConfigTab dataSources={dataSources} />
        ) : (
          <GuidelineTab />
        )}
      </main>

      {/* Finalize Modal */}
      {showFinalModal && finalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-blue-50 px-6 py-4 flex justify-between items-center border-b border-blue-100">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-blue-600" />
                        <span className="text-blue-900 font-medium tracking-wide text-lg">Approve Golden Record</span>
                    </div>
                    <button onClick={() => setShowFinalModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <p className="text-slate-600 mb-6">Please review the finalized Golden Record before saving to the master table. The source duplicates will be marked as resolved.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(finalRecord).map(([key, value]) => (
                            <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{key}</div>
                                <div className="text-sm font-mono text-slate-800 break-all">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-4">
                    <button 
                        onClick={() => setShowFinalModal(false)}
                        className="px-6 py-2 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-8 py-2 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Save size={16} />
                        Approve & Save
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default App;
