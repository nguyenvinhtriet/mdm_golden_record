/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface CsvRow {
  _id: string;
  [key: string]: any;
}

export interface ConflictCase {
  id: string;
  groupKey: string;
  rows: CsvRow[];
}

export interface ProcessedResult {
  id: string;
  input: ConflictCase;
  output: any | null;
  logs: string[];
  durationMs: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'resolved';
  error?: string;
  draftRecord?: Record<string, string>;
  conflicts?: Record<string, boolean>;
}

