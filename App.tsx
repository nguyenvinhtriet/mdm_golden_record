/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { CsvRow, ConflictCase, ProcessedResult } from './types';
import { mergeCsvRowsWithFlash } from './services/geminiService';
import { LogTerminal } from './components/LogTerminal';
import { Zap, Play, Upload, Database, Layers, FileJson, Terminal, ArrowRight, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import * as fuzzball from 'fuzzball';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [groupingColumn, setGroupingColumn] = useState<string>('customer_id');
  
  const [queue, setQueue] = useState<ConflictCase[]>([]);
  const [resolutionHistory, setResolutionHistory] = useState<ProcessedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [processedCount, setProcessedCount] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);

  const [showFinalModal, setShowFinalModal] = useState(false);
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

  const recalculateConflicts = (data: CsvRow[], groupCol: string) => {
    const conflicts = findDuplicates(data, groupCol);
    setQueue(conflicts);
    
    const initialHistory: ProcessedResult[] = conflicts.map(c => {
        const draftRecord: Record<string, string> = {};
        const fieldConflicts: Record<string, boolean> = {};
        const displayColumns = ['customer_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'date_of_birth', 'job_title'];

        displayColumns.forEach(col => {
            const values = c.rows.map(r => String(r[col] || '').trim()).filter(v => v !== '' && v !== 'NULL' && v !== 'None' && v !== 'null' && v !== 'n/a' && v !== 'NA');
            const uniqueValues = Array.from(new Set(values));

            if (uniqueValues.length === 1) {
                draftRecord[col] = uniqueValues[0];
                fieldConflicts[col] = false;
            } else if (uniqueValues.length > 1) {
                fieldConflicts[col] = true;
            } else {
                draftRecord[col] = '';
                fieldConflicts[col] = false;
            }
        });

        return {
            id: c.id,
            input: c,
            output: null,
            logs: ["Waiting for resolution..."],
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

  const processCsvData = (data: CsvRow[], cols: string[]) => {
    setCsvData(data);
    
    const possibleCols = ['customer_id', 'id', 'email', 'phone', 'name'];
    const detectedCol = cols.find(c => possibleCols.includes(c.toLowerCase()));
    const initialGroupCol = detectedCol || (cols.length > 0 ? cols[0] : 'customer_id');
    setGroupingColumn(initialGroupCol);

    recalculateConflicts(data, initialGroupCol);
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
      const response = await fetch('/customer_master_data_practice.csv');
      if (!response.ok) {
        throw new Error('Failed to load example data');
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const cols = results.meta.fields || [];
          setColumns(cols);
          
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

  const findDuplicates = (data: CsvRow[], groupColumn: string) => {
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

            // If email matches exactly, we can be more lenient on the name (e.g., Bob vs Robert)
            const isStrongEmailMatch = isEmailMatch && nameRatio > 60;
            // If only zip matches, we need a stronger name match
            const isStrongZipMatch = isZipMatch && nameRatio > 85;

            if (isStrongEmailMatch || isStrongZipMatch) {
                currentGroup.push(rowB);
                processedRows.add(rowB._id);
            }
        }

        if (currentGroup.length > 1) {
            fuzzyGroups.push(currentGroup);
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

    return conflicts;
  };

  const resolveWithGemini = async (item: ConflictCase) => {
    setResolutionHistory(prev => prev.map(r => {
      if (r.id === item.id) {
        return { ...r, status: 'processing', logs: ["Analyzing conflicting rows..."] };
      }
      return r;
    }));

    const start = performance.now();
    const result = await mergeCsvRowsWithFlash(item.rows);
    const duration = performance.now() - start;

    setResolutionHistory(prev => prev.map(r => {
      if (r.id === item.id) {
        return {
          ...r,
          output: result.json,
          draftRecord: result.json || r.draftRecord,
          logs: result.logs,
          durationMs: duration,
          status: 'completed'
        };
      }
      return r;
    }));

    setProcessedCount(prev => {
      const newCount = prev + 1;
      setAvgLatency(prevAvg => (prevAvg * prev + duration) / newCount);
      return newCount;
    });
  };

  const resolveAllWithGemini = async () => {
    const pendingItems = resolutionHistory.filter(r => r.status === 'pending').map(r => r.input);
    if (isProcessing || pendingItems.length === 0) return;
    setIsProcessing(true);

    let currentIdx = 0;

    const processNext = async () => {
      if (currentIdx >= pendingItems.length) {
        setIsProcessing(false);
        return;
      }
      await resolveWithGemini(pendingItems[currentIdx]);
      currentIdx++;
      setTimeout(processNext, 500);
    };

    processNext();
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

  const latestResult = resolutionHistory.length > 0 ? resolutionHistory[resolutionHistory.length - 1] : null;

  const displayColumns = ['customer_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'date_of_birth', 'job_title'];

  return (
    <div className="min-h-screen bg-[#121212] text-[#E3E3E3] p-6 font-sans">
      
      <header className="max-w-[1600px] mx-auto mb-8 flex flex-col md:flex-row justify-between items-center pb-6 border-b border-[#444746]">
        <div className="flex items-center gap-4">
          <div className="bg-[#1E1E1E] p-3 rounded-2xl shadow-lg border border-[#444746]">
            <Layers className="text-[#8AB4F8]" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-normal text-[#E3E3E3] tracking-tight">
              Golden Record Mastering
            </h1>
            <p className="text-[#C4C7C5] text-sm mt-1 max-w-3xl">
              Upload a CSV, identify duplicates via exact and fuzzy matching, and interactively build a Golden Record.
            </p>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6 md:mt-0 items-center">
          {columns.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#444746] bg-[#1E1E1E]">
              <label className="text-xs text-[#C4C7C5] font-medium uppercase tracking-wider">Primary Key:</label>
              <select 
                value={groupingColumn} 
                onChange={handleGroupingColumnChange}
                className="bg-transparent text-[#E3E3E3] text-sm focus:outline-none cursor-pointer"
              >
                {columns.map(col => (
                  <option key={col} value={col} className="bg-[#1E1E1E]">{col}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={loadExampleData}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#8AB4F8] text-[#8AB4F8] hover:bg-[#8AB4F8]/10 transition-colors text-sm font-medium tracking-wide uppercase cursor-pointer"
          >
            Load Example Data
          </button>
          
          <label className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#8AB4F8] text-[#8AB4F8] hover:bg-[#8AB4F8]/10 transition-colors text-sm font-medium tracking-wide uppercase cursor-pointer">
            <Upload size={18} />
            Upload CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <section className="lg:col-span-3 flex flex-col gap-6 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
           <div className="flex flex-col gap-4 flex-1 min-h-0">
               <div className="flex justify-between items-center px-2">
                    <h2 className="text-lg font-medium text-[#E3E3E3] flex items-center gap-2">
                        <Database size={18} className="text-[#C4C7C5]"/> 
                        Conflict Clusters
                    </h2>
                    <span className="bg-[#1E1E1E] border border-[#444746] text-[#E3E3E3] text-xs font-bold px-3 py-1 rounded-full">{resolutionHistory.length}</span>
               </div>
               
               <div className="bg-[#1E1E1E] rounded-[24px] p-2 flex-1 shadow-sm border border-[#444746] overflow-hidden flex flex-col min-h-[200px]">
                 <div className="flex-1 overflow-y-auto space-y-2 p-2 custom-scrollbar">
                   {resolutionHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-[#757775]">
                        <Database size={32} className="opacity-20 mb-3" />
                        <span className="italic text-sm">No conflicts found</span>
                     </div>
                   )}
                   {resolutionHistory.map((item) => (
                     <div 
                        key={item.id} 
                        onClick={() => setSelectedConflictId(item.id)}
                        className={cn("p-4 rounded-xl border transition-all group relative overflow-hidden cursor-pointer",
                          selectedConflictId === item.id ? "bg-[#2B2B2B] border-[#8AB4F8]" : "bg-[#1E1E1E] border-transparent hover:border-[#8AB4F8]/30"
                        )}
                     >
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[#8AB4F8] text-[10px] font-mono tracking-wider truncate mr-2">{item.input.groupKey}</span>
                         <span className="text-[#757775] text-[10px] shrink-0">{item.input.rows.length} rows</span>
                       </div>
                       <div className="mt-2 flex justify-between items-center">
                         <span className={cn("text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider",
                           item.status === 'resolved' ? 'bg-[#1b5e20] text-[#a8dab5]' :
                           item.status === 'completed' ? 'bg-[#004A77] text-[#78D9EC]' :
                           item.status === 'processing' ? 'bg-[#004A77] text-[#78D9EC] animate-pulse' :
                           'bg-[#444746] text-[#C4C7C5]'
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
               <h2 className="text-sm font-medium text-[#C4C7C5] px-2 flex items-center gap-2">
                  <Terminal size={14}/> Live Output Log
               </h2>
               <div className="flex-1 bg-[#1E1E1E] rounded-2xl border border-[#444746] overflow-hidden shadow-lg">
                  <LogTerminal 
                    logs={latestResult ? latestResult.logs : []} 
                    type="flash" 
                  />
               </div>
           </div>
        </section>

        <section className="lg:col-span-9 flex flex-col gap-6">
          <div className="bg-[#121212] rounded-[32px] border border-[#444746] p-1 shadow-2xl relative flex flex-col min-h-[800px]">
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'radial-gradient(#444746 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
             </div>

             <div className="sticky top-0 z-30 p-6 flex justify-between items-center bg-[#1E1E1E]/90 backdrop-blur-md rounded-t-[28px] border-b border-[#444746]">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-[#004A77] flex items-center justify-center">
                      <Zap className="fill-[#78D9EC] text-[#78D9EC]" size={20} />
                   </div>
                   <div>
                       <h2 className="text-lg font-medium text-[#E3E3E3]">Data Steward Workspace</h2>
                       <p className="text-xs text-[#C4C7C5]">Interactively resolve conflicts to build a Golden Record.</p>
                   </div>
                </div>
                {resolutionHistory.filter(r => r.status === 'pending').length > 0 && (
                    <button 
                        onClick={resolveAllWithGemini}
                        disabled={isProcessing}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors",
                            isProcessing 
                                ? "bg-[#1E1E1E] text-[#757775] cursor-not-allowed border border-[#444746]"
                                : "bg-[#004A77] hover:bg-[#8AB4F8] hover:text-[#001D35] text-[#D3E3FD]"
                        )}
                    >
                        <Zap size={14} />
                        {isProcessing ? 'Processing...' : 'Resolve All with AI'}
                    </button>
                )}
             </div>

             <div className="relative z-10 p-6 pb-20">
                {resolutionHistory.filter(r => r.status !== 'resolved').length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[600px] opacity-30">
                        <Layers size={80} className="mb-4 text-[#8AB4F8]" />
                        <p className="text-xl">System Idle</p>
                        <p className="text-sm mt-2">Load example data or upload a CSV to begin mastering.</p>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {resolutionHistory.filter(r => r.id === selectedConflictId && r.status !== 'resolved').map((result) => {
                          const isReadyToFinalize = displayColumns.every(col => result.draftRecord && result.draftRecord[col] !== undefined);

                          return (
                            <div 
                                key={result.id} 
                                className="transition-all duration-700 ease-in-out opacity-100 scale-100"
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-xl font-semibold text-[#8AB4F8]">{result.input.groupKey}</h3>
                                    {result.status === 'pending' && (
                                        <button 
                                            onClick={() => resolveWithGemini(result.input)}
                                            disabled={isProcessing}
                                            className={cn("flex items-center gap-2 px-4 py-2 rounded-full transition-colors text-xs font-bold uppercase tracking-wider",
                                                isProcessing 
                                                    ? "bg-[#1E1E1E] text-[#757775] cursor-not-allowed border border-[#444746]"
                                                    : "bg-[#004A77] hover:bg-[#8AB4F8] hover:text-[#001D35] text-[#D3E3FD]"
                                            )}
                                        >
                                            <Zap size={14} />
                                            Resolve with AI
                                        </button>
                                    )}
                                    {result.status === 'processing' && (
                                        <span className="flex items-center gap-2 text-[#78D9EC] text-xs font-bold uppercase tracking-wider animate-pulse">
                                            <Zap size={14} />
                                            AI is Thinking...
                                        </span>
                                    )}
                                </div>

                                <div className="overflow-x-auto bg-[#1E1E1E] rounded-2xl border border-[#444746] shadow-lg">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-[#C4C7C5] uppercase bg-[#2B2B2B] border-b border-[#444746]">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Field</th>
                                                {result.input.rows.map((_, i) => (
                                                    <th key={i} className="px-4 py-3 font-medium border-l border-[#444746]">Record {i + 1}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayColumns.map((col) => {
                                                const hasConflict = result.conflicts?.[col];
                                                return (
                                                    <tr key={col} className="border-b border-[#444746]/50 hover:bg-[#2B2B2B]/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-[#E3E3E3] flex items-center gap-2">
                                                            {col}
                                                            {hasConflict && <AlertCircle size={14} className="text-yellow-500" />}
                                                        </td>
                                                        {result.input.rows.map((row, i) => {
                                                            const val = String(row[col] || '').trim();
                                                            const isSelected = result.draftRecord?.[col] === val && val !== '';
                                                            const isNullLike = val === '' || val === 'NULL' || val === 'None' || val === 'null' || val === 'n/a' || val === 'NA';

                                                            return (
                                                                <td key={i} className={cn("px-4 py-3 border-l border-[#444746]", hasConflict ? "bg-yellow-500/10" : "")}>
                                                                    {!isNullLike ? (
                                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                                            <input 
                                                                                type="radio" 
                                                                                name={`${result.id}-${col}`}
                                                                                checked={isSelected}
                                                                                onChange={() => handleFieldSelect(result.id, col, val)}
                                                                                className="w-4 h-4 text-[#8AB4F8] bg-[#121212] border-[#444746] focus:ring-[#8AB4F8] focus:ring-2"
                                                                            />
                                                                            <span className={cn("break-all", isSelected ? "text-[#8AB4F8] font-medium" : "text-[#C4C7C5] group-hover:text-[#E3E3E3]")}>
                                                                                {val}
                                                                            </span>
                                                                        </label>
                                                                    ) : (
                                                                        <span className="text-[#757775] italic text-xs">Empty</span>
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

                                <div className="mt-8 bg-[#004A77]/20 border border-[#004A77] rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-[#78D9EC] flex items-center gap-2">
                                            <CheckCircle2 size={20} />
                                            Draft Golden Record
                                        </h4>
                                        <button
                                            onClick={() => handleFinalize(result)}
                                            disabled={!isReadyToFinalize}
                                            className={cn("flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium tracking-wide uppercase transition-all shadow-md",
                                                isReadyToFinalize 
                                                    ? "bg-[#8AB4F8] text-[#001D35] hover:bg-[#A8C7FA] shadow-lg shadow-[#8AB4F8]/20" 
                                                    : "bg-[#1E1E1E] text-[#757775] cursor-not-allowed border border-[#444746]"
                                            )}
                                        >
                                            <Save size={16} />
                                            Finalize Golden Record
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {displayColumns.map(col => (
                                            <div key={col} className="bg-[#121212] p-3 rounded-xl border border-[#444746]">
                                                <div className="text-[10px] uppercase tracking-wider text-[#C4C7C5] mb-1">{col}</div>
                                                <div className={cn("text-sm font-mono break-all", result.draftRecord?.[col] ? "text-[#E3E3E3]" : "text-[#757775] italic")}>
                                                    {result.draftRecord?.[col] || 'Pending selection...'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-12 border-b border-[#444746]/50 w-full"></div>
                            </div>
                          );
                        })}
                    </div>
                )}
             </div>

          </div>
        </section>

      </main>

      {/* Finalize Modal */}
      {showFinalModal && finalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1E1E1E] rounded-3xl border border-[#444746] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#004A77] px-6 py-4 flex justify-between items-center border-b border-[#00639B]">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-[#78D9EC]" />
                        <span className="text-[#D3E3FD] font-medium tracking-wide text-lg">Approve Golden Record</span>
                    </div>
                    <button onClick={() => setShowFinalModal(false)} className="text-[#D3E3FD] hover:text-white">✕</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <p className="text-[#C4C7C5] mb-6">Please review the finalized Golden Record before saving to the master table. The source duplicates will be marked as resolved.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(finalRecord).map(([key, value]) => (
                            <div key={key} className="bg-[#121212] p-3 rounded-xl border border-[#444746]">
                                <div className="text-[10px] uppercase tracking-wider text-[#C4C7C5] mb-1">{key}</div>
                                <div className="text-sm font-mono text-[#E3E3E3] break-all">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t border-[#444746] bg-[#2B2B2B] flex justify-end gap-4">
                    <button 
                        onClick={() => setShowFinalModal(false)}
                        className="px-6 py-2 rounded-full text-sm font-medium text-[#E3E3E3] hover:bg-[#444746] transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleApprove}
                        className="flex items-center gap-2 px-8 py-2 rounded-full text-sm font-medium bg-[#8AB4F8] text-[#001D35] hover:bg-[#A8C7FA] transition-colors shadow-lg shadow-[#8AB4F8]/20"
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
          background-color: #444746;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default App;
