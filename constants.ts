/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { InputData } from './types';

export const SYSTEM_INSTRUCTION_MERGE = `
You are an intelligent Data Resolution Engine.
Your goal is to merge an existing specific "Customer Record" (JSON) with a recent "Chat Transcript" (Text) to produce a single, up-to-date "Golden Record".

Rules:
1. Trust the Chat Transcript for the most recent information (e.g., if user says "my new email is...", update the email).
2. Extract the user's intent from the chat (e.g., "Updating info", "Billing complaint", "Upgrade request").
3. Analyze the sentiment of the chat.
4. Keep fields from the Customer Record if they are not mentioned or changed in the chat.
5. Format phone numbers to a standard international format if present in chat.
6. Return a list of fields that were specifically updated or added based on the chat.

Output STRICT JSON:
{
  "customer_id": string,
  "name": string,
  "email": string,
  "phone": string (or null),
  "current_tier": string,
  "latest_sentiment": "Positive" | "Neutral" | "Negative",
  "identified_intent": string,
  "updates_applied": string[],
  "confidence_score": number (0-1)
}
`;

// Logical Scenarios mapping specific personas to specific states to avoid confusion
const SCENARIOS = [
  {
    name: "Rachel Zane",
    current_tier: "Silver",
    email: "rachel.z@paralegal.com",
    phone: "212-555-0199",
    chat: "I finally passed the bar exam! Please update my email to rachel.zane@attorney.com and upgrade me to the Gold tier.",
    intent: "Multi-field Update",
  },
  {
    name: "Harvey Specter",
    current_tier: "Platinum",
    email: "harvey@specter.com",
    phone: "212-555-9999",
    chat: "Your service is actively costing me money. The latency is unacceptable. Fix it immediately or I'm moving my firm's account.",
    intent: "Complaint",
  },
  {
    name: "Mike Ross",
    current_tier: "Bronze",
    email: "mross@pearson.com",
    phone: null,
    chat: "Hey, I need to add my mobile number to the account. It's 646-555-1234. Also, can you check if I'm eligible for the Silver tier?",
    intent: "Phone Add + Inquiry",
  },
  {
    name: "Louis Litt",
    current_tier: "Gold",
    email: "louis@litt.com",
    phone: "212-555-LITT",
    chat: "This is Louis Litt. My name should appear as 'Louis Litt, Name Partner'. Please correct this clerical error at once. And ensure my email is managing@litt.com.",
    intent: "Name & Email Fix",
  },
  {
    name: "Donna Paulsen",
    current_tier: "Platinum",
    email: "donna@firm.com",
    phone: "212-555-1000",
    chat: "I'm assuming you already know I want to change my plan. Downgrade me to Gold, I don't need the extra seats anymore. Thanks!",
    intent: "Downgrade",
  },
  {
    name: "Jessica Pearson",
    current_tier: "Platinum",
    email: "jessica@pearson.com",
    phone: "312-555-0001",
    chat: "I am relocating to Chicago. Please remove my New York office phone number from the record.",
    intent: "Field Removal",
  },
  {
    name: "Alex Williams",
    current_tier: "Silver",
    email: "alex.w@bratton.com",
    phone: "555-0102",
    chat: "My email has a typo. It is currently alex.w@bratton.com but it should be alex.williams@bratton.com. Please fix.",
    intent: "Typo Correction",
  },
  {
    name: "Katrina Bennett",
    current_tier: "Gold",
    email: "katrina@specter.com",
    phone: "212-555-8888",
    chat: "I am requesting a formal update to my contact preferences. Do not contact me via phone. Please remove the number on file.",
    intent: "Preference Update",
  }
];

let sequenceIndex = 0;

export const generateInputData = (count: number): InputData[] => {
  const data: InputData[] = [];
  
  for (let i = 0; i < count; i++) {
    // Cycle through scenarios sequentially to ensure logical progression
    const scenario = SCENARIOS[sequenceIndex % SCENARIOS.length];
    sequenceIndex++;

    const customerRecord = {
      customer_id: `CUST-${1000 + sequenceIndex}`,
      name: scenario.name,
      email: scenario.email,
      phone: scenario.phone,
      current_tier: scenario.current_tier as any,
      last_updated: new Date(Date.now() - 86400000 * (Math.floor(Math.random() * 30) + 1)).toISOString().split('T')[0]
    };

    data.push({
      id: Math.random().toString(36).substring(7).toUpperCase(),
      customerRecord,
      chatTranscript: `User: ${scenario.chat}`,
      timestamp: Date.now() + (i * 2000), // Slight stagger
    });
  }
  
  return data;
};