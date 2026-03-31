/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const mergeCsvRowsWithFlash = async (rows: any[]): Promise<{ json: any | null, logs: string[] }> => {
  try {
    const ai = getClient();
    
    const prompt = `
    INPUT CONTEXT:
    Conflicting Records (JSON array): ${JSON.stringify(rows, null, 2)}
    
    Task: Resolve the conflicts and create a single, unified "Golden Record".
    - Merge the data intelligently.
    - Prefer non-null, more detailed, or more recent-looking values.
    - For addresses, prefer the most complete address (e.g., includes suite or apartment number).
    - For names, prefer the full name over initials or nicknames if obvious.
    - For phone numbers, prefer standard formatting if possible.
    - Return ONLY a JSON object representing the merged golden record.
    - The JSON object should have keys corresponding to the fields in the input records.
    - Do not include the internal '_id' field in the output.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert data steward. You merge conflicting database records into a single golden record. Output only valid JSON.",
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return {
      json: JSON.parse(jsonStr),
      logs: [
        `Ingested ${rows.length} conflicting records...`,
        `Analyzing field variations...`,
        `Applying merge heuristics...`,
        `Resolved Golden Record.`
      ]
    };
  } catch (error) {
    console.error("Flash Error:", error);
    return {
      json: null,
      logs: [`Error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};
