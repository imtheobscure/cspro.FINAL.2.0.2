import React, { useEffect, useState } from 'react';
import { LearnerProfile } from '../types';
import { User, Mail, FileText, Bookmark, Award, Send, RefreshCw } from 'lucide-react';

interface LearnerProfileFormProps {
  profile: LearnerProfile;
  onChange: (profile: LearnerProfile) => void;
}

const STORAGE_KEY = 'draft_learner_profile_v1';

export const LearnerProfileForm: React.FC<LearnerProfileFormProps> = ({ profile, onChange }) => {
  const [saveIndicator, setSaveIndicator] = useState<string>('');

  // Load from LocalStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          onChange(parsed);
          setSaveIndicator('Draft restored successfully');
          setTimeout(() => setSaveIndicator(''), 3000);
        }
      }
    } catch (e) {
      console.warn("Could not parse draft profile");
    }
  }, []);

  // Update field trigger
  const updateField = (field: keyof LearnerProfile, value: string) => {
    const updated = { ...profile, [field]: value };
    onChange(updated);
    
    // Autosave
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSaveIndicator('Autosaved');
      const timer = setTimeout(() => setSaveIndicator(''), 1500);
      return () => clearTimeout(timer);
    } catch (e) {}
  };

  const handleReset = () => {
    if (confirm("Reset learner dossier configuration to clean defaults?")) {
      const defaultProfile: LearnerProfile = {
        name: '',
        id: '',
        email: '',
        notes: '',
        context: 'General Knowledge / Professional Accreditation',
        targetScore: '80%',
        tutorEmail: 'tutor@academy-portal.edu',
        collectCandidateInfo: false
      };
      onChange(defaultProfile);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      setSaveIndicator('Cleared');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 transition-all">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Candidate & Context Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Details embedded securely inside generated standalone proctored documents.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {saveIndicator && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md animate-fade-in">
              {saveIndicator}
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors px-2.5 py-1.5 rounded hover:bg-slate-50"
            title="Reset candidate form inputs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Candidate Full Name *
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              required
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Learner ID */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Candidate System ID / Reference
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile.id}
              onChange={(e) => updateField('id', e.target.value)}
              placeholder="e.g. CAND-2026-99"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <Bookmark className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Candidate Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={profile.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="jane.doe@example.com"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Target Score */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Target Certification Level / Goal
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile.targetScore || ''}
              onChange={(e) => updateField('targetScore', e.target.value)}
              placeholder="e.g. Grade A / Professional Level"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Contextual facts */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Exam Context / Institutional Purpose
          </label>
          <div className="relative">
            <input
              type="text"
              value={profile.context}
              onChange={(e) => updateField('context', e.target.value)}
              placeholder="e.g. Pre-employment software logic screening test"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Tutor submission mapping */}
        <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            Tutor Submission / Result Review Email Mapping
          </label>
          <p className="text-xs text-slate-500 mb-2">
            The generated exam report will feature an embedded action parameter linking scores directly to this advisor via client mail.
          </p>
          <input
            type="email"
            value={profile.tutorEmail || ''}
            onChange={(e) => updateField('tutorEmail', e.target.value)}
            placeholder="instructor@university-dept.edu"
            className="w-full text-sm px-3 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Special Notes */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Special Arrangements & Additional Notes
          </label>
          <textarea
            value={profile.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
            placeholder="e.g. Extra time accommodation active, low screen brightness requested."
            className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        <label className="md:col-span-2 flex items-start gap-3 p-3 rounded-lg border border-indigo-200 bg-indigo-50/60 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(profile.collectCandidateInfo)}
            onChange={(e) => onChange({ ...profile, collectCandidateInfo: e.target.checked })}
            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-400"
          />
          <div>
            <span className="text-xs font-semibold text-slate-800 block">Ask for learner info at test start</span>
            <span className="text-[11px] text-slate-500 block leading-normal">
              Each candidate will enter their own name, ID, email, and notes at the beginning of the standalone HTML test. Results can then be emailed to the tutor automatically.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
