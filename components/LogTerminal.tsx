/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';

interface LogTerminalProps {
  logs: string[];
  type: 'flash' | 'thinking';
  streamText?: string; 
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, type, streamText }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track if we should stick to the bottom. Default to true so it starts at bottom.
  const isAtBottomRef = useRef(true);
  
  const typeColor = type === 'flash' ? 'text-[#78D9EC]' : 'text-[#D0BCFF]';

  // Check scroll position when user scrolls
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If within 50px of the bottom, consider it "at bottom"
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
    isAtBottomRef.current = isAtBottom;
  };

  useEffect(() => {
    // Only auto-scroll if the user hasn't scrolled up manually
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, streamText]);

  return (
    <div className="flex flex-col h-full bg-[#121212] rounded-2xl border border-[#444746] overflow-hidden font-mono text-xs">
      
      {/* Console Header */}
      <div className="bg-[#1E1E1E] px-4 py-2 border-b border-[#444746] flex justify-between items-center">
        <span className={`font-bold ${typeColor} text-[10px] uppercase tracking-widest`}>
            {type === 'flash' ? 'OUTPUT_LOG' : 'CHAIN_OF_THOUGHT'}
        </span>
        <div className="flex space-x-1.5 opacity-50">
          <div className="w-2.5 h-2.5 rounded-full bg-[#444746]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#444746]"></div>
        </div>
      </div>

      {/* Console Body */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto space-y-2"
      >
        {type === 'thinking' && streamText ? (
           <div className="whitespace-pre-wrap text-[#D0BCFF] leading-relaxed">
             {streamText.replace(/<[^>]*>?/gm, '')}
             <span className="inline-block w-2 h-4 bg-[#D0BCFF] ml-1 animate-blink align-middle"></span>
           </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start">
              <span className="text-[#5E5E5E] mr-3 select-none shrink-0">
                {new Date().toLocaleTimeString().split(' ')[0]}
              </span>
              <span className={type === 'flash' ? 'text-[#AECBFA]' : 'text-[#E8DEF8]'} style={{ opacity: Math.max(0.4, 1 - (logs.length - i) * 0.1) + 0.3 }}>
                {log}
              </span>
            </div>
          ))
        )}
        
        {logs.length === 0 && !streamText && (
          <div className="text-[#444746] italic flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-[#444746]"></span>
             System idle
          </div>
        )}
      </div>
    </div>
  );
};