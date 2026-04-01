import React from 'react';
import { BookOpen, ShieldCheck, Cpu, GitMerge, FileOutput, Database, Layers } from 'lucide-react';

export const GuidelineTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-medium text-slate-900">Guideline & Behind the Scenes</h2>
            <p className="text-slate-500 mt-1">Understanding how Golden Record Mastering works in this application.</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-relaxed">
            This application is designed to help you identify duplicate records across different data sources and consolidate them into a single, authoritative "Golden Record". 
            Here is a breakdown of what happens to your data and how the cleansing process works behind the scenes.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-4 flex items-center gap-2">
            <ShieldCheck className="text-green-600" size={20} />
            Data Privacy & Storage (In-Memory Cache)
          </h3>
          <p className="text-slate-700 leading-relaxed">
            <strong>Your data never leaves your browser.</strong> When you upload a CSV file, the data is loaded directly into the application's <em>in-memory cache</em>. 
            We do not send your transaction data to any external servers or databases. 
            Once you resolve conflicts and approve a Golden Record, it is stored in this temporary memory. 
            You can export the final dataset as a new CSV file. If you refresh the page, the data will be cleared.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mt-8 mb-4 flex items-center gap-2">
            <Cpu className="text-indigo-600" size={20} />
            The 4-Step Cleansing Process
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2"><Layers size={16} className="text-indigo-500"/> 1. Normalization</h4>
              <p className="text-sm text-slate-600">
                Before comparing records, the system normalizes the data to ensure consistency. This includes trimming whitespace, converting emails to lowercase, standardizing state abbreviations, and formatting phone numbers to the E.164 standard (e.g., +1234567890).
              </p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2"><Database size={16} className="text-indigo-500"/> 2. Blocking</h4>
              <p className="text-sm text-slate-600">
                To optimize performance, the system uses a "Blocking" technique. Instead of comparing every record against every other record (which is slow), it groups records by a <strong>Primary Key</strong> (like Customer ID). It only looks for duplicates within these blocks.
              </p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2"><GitMerge size={16} className="text-indigo-500"/> 3. Fuzzy Matching</h4>
              <p className="text-sm text-slate-600">
                Within each block, the system uses the <code>fuzzball</code> library to perform fuzzy string matching on key fields like Email and Zip Code. It calculates a similarity score (0-100). If the score exceeds the configured threshold, the records are flagged as potential duplicates.
              </p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2"><FileOutput size={16} className="text-indigo-500"/> 4. Survivorship</h4>
              <p className="text-sm text-slate-600">
                Once duplicates are clustered, the system applies "Survivorship Rules" to automatically draft a Golden Record. For example, it might pick the longest address string, or the most complete phone number. You can then manually review and override these selections before finalizing.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
