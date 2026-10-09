import React, { useState } from 'react';
import { Learner, Competency, Need, CoursePlan } from '../../../types2';
import Modal from '../Modal';

interface UpdateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  learner: Learner;
  onUpdate: (updatedLearner: Learner) => void;
}

export interface ProfileChangeItem {
  id: string;
  section: 'competencies' | 'personalInformation' | 'needsWantsExpectations' | 'coursePlan' | 'feedbackFacts';
  type: 'addition' | 'modification' | 'deletion';
  title: string;
  details: string;
  dataPayload: any;
  enabled: boolean;
  isEditing?: boolean;
}

const SECTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  competencies: { label: 'Competency Overview', icon: 'fa-sitemap', color: 'blue' },
  personalInformation: { label: 'Personal Information', icon: 'fa-id-card', color: 'purple' },
  needsWantsExpectations: { label: 'Needs, Wants & Expectations', icon: 'fa-compass', color: 'amber' },
  coursePlan: { label: 'Course Plan', icon: 'fa-book', color: 'indigo' },
  feedbackFacts: { label: 'Feedback (Facts)', icon: 'fa-comments', color: 'emerald' },
};

export const UpdateProfileModal: React.FC<UpdateProfileModalProps> = ({
  isOpen,
  onClose,
  learner,
  onUpdate
}) => {
  const [transcript, setTranscript] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<'input' | 'review'>('input');
  const [changeItems, setChangeItems] = useState<ProfileChangeItem[]>([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [parseError, setParseError] = useState<string | null>(null);

  // Quick reset when modal opens or closes
  const handleClose = () => {
    setTranscript('');
    setJsonInput('');
    setIsCopied(false);
    setActiveStep('input');
    setChangeItems([]);
    setParseError(null);
    onClose();
  };

  // Compile Master Copy Prompt (No AI wording in UI)
  const compileMasterPrompt = (): string => {
    const competenciesList = (learner.competencies || [])
      .map(c => `- ${c.name} [Type: ${c.type || 'general'}, Status: ${c.status}, Current Score: ${c.progress}%]`)
      .join('\n') || 'None recorded';

    const personalInfoList = `
- Occupation: ${learner.occupation || 'N/A'}
- Native Language: ${learner.l1Language || 'N/A'}
- Target Language: ${learner.targetLanguage || 'N/A'}
- Learning Style: ${learner.learningStyle || 'N/A'}
- Interests: ${learner.interests || 'N/A'}
- Stated Goals: ${(learner.goals || []).join(', ') || 'N/A'}
- Clinical Profile Notes: ${learner.notes || 'N/A'}
    `.trim();

    const needsList = (learner.needs || [])
      .map(n => `- ${n.name} (Priority: ${n.priority || 'medium'}, Status: ${n.status || 'active'})`)
      .join('\n') || 'None recorded';

    const expectationsText = learner.expectations || 'None specified';

    const coursePlanText = learner.coursePlan ? `
- Course Name: ${learner.coursePlan.courseName || learner.coursePlan.title || 'N/A'}
- Target Level: ${learner.coursePlan.targetLevel || 'N/A'}
- Modules: ${(learner.coursePlan.modules || []).map(m => m.title).join(', ') || 'N/A'}
    `.trim() : 'No formal course plan configured';

    const existingFactsText = learner.facts ? JSON.stringify(learner.facts, null, 2) : 'No extra facts recorded';

    return `
Act as an expert Educational Profile Processor.
Analyze the student profile data below alongside the newly provided lesson transcript/notes.
Your objective is to extract new facts, modifications, and obsolete facts across 5 key sections:
1. Competency Overview
2. Personal Information
3. Needs, Wants & Expectations
4. Course Plan
5. Feedback (Facts)

CRITICAL INSTRUCTION:
This process is NOT to increase or decrease the numerical percentage scores of competencies.
Focus exclusively on adding, modifying, and deleting factual observations, competency entries/descriptions, personal information, needs, wants, expectations, course plan items, and feedback observations.

================ CURRENT STUDENT PROFILE FACTS ================
Student Name: ${learner.name}
Current Level: ${learner.level || 'Intermediate'}

--- 1. Competency Overview ---
${competenciesList}

--- 2. Personal Information ---
${personalInfoList}

--- 3. Needs, Wants & Expectations ---
Needs:
${needsList}
Expectations: ${expectationsText}

--- 4. Course Plan ---
${coursePlanText}

--- 5. Feedback (Facts) ---
Existing Facts & Notes:
${existingFactsText}

================ NEW LESSON TRANSCRIPT / NOTES ================
${transcript.trim() || 'No specific transcript provided. Re-evaluate profile facts based on recent observations.'}

================ REQUIRED OUTPUT FORMAT ================
Return ONLY a valid JSON object matching this exact schema:

{
  "competencies": {
    "additions": [
      { "name": "Skill or Topic Name", "type": "grammar|vocabulary|fluency|listening|reading|writing", "status": "Learning", "note": "Fact description" }
    ],
    "modifications": [
      { "name": "Existing Skill Name", "status": "Practicing", "note": "Updated fact description" }
    ],
    "deletions": [
      "Obsolete skill name to remove"
    ]
  },
  "personalInformation": {
    "additions": {
      "interests": ["New Interest"],
      "goals": ["New Goal"]
    },
    "modifications": {
      "occupation": "Updated Occupation",
      "learningStyle": "Updated Style",
      "targetLanguage": "Updated Target",
      "notes": "Updated general student summary facts"
    },
    "deletions": {
      "interests": ["Obsolete interest to remove"]
    }
  },
  "needsWantsExpectations": {
    "additions": {
      "needs": [{ "name": "New Identified Need", "priority": "high", "description": "Need details" }],
      "wants": ["New Want"],
      "expectations": ["New Expectation"]
    },
    "modifications": {
      "expectations": "Updated overall expectation text"
    },
    "deletions": {
      "needs": ["Need name to remove"]
    }
  },
  "coursePlan": {
    "additions": {
      "modules": [{ "title": "New Module Title", "topics": ["Topic 1", "Topic 2"] }]
    },
    "modifications": {
      "courseName": "Updated Course Title",
      "targetLevel": "Updated Target Level"
    },
    "deletions": {
      "modules": ["Module title to remove"]
    }
  },
  "feedbackFacts": {
    "additions": {
      "strengths": ["Observed Strength"],
      "improvements": ["Target Area for Improvement"],
      "factualNotes": ["Specific fact from transcript"]
    },
    "modifications": {
      "tutorNotes": "Updated factual tutor observation summary"
    },
    "deletions": {
      "factualNotes": ["Outdated fact to remove"]
    }
  }
}
    `.trim();
  };

  const handleCopyPrompt = async () => {
    try {
      const promptText = compileMasterPrompt();
      await navigator.clipboard.writeText(promptText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (e) {
      console.error("Copy error:", e);
    }
  };

  // Convert raw JSON object into flat ProfileChangeItem list for editing/review
  const parseJsonToChangeItems = (rawJsonStr: string) => {
    setParseError(null);
    try {
      const cleaned = rawJsonStr.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      if (!cleaned) {
        setParseError('Please paste valid JSON content.');
        return;
      }

      const parsed = JSON.parse(cleaned);
      const items: ProfileChangeItem[] = [];
      let count = 0;

      const addChange = (
        section: ProfileChangeItem['section'],
        type: ProfileChangeItem['type'],
        title: string,
        details: string,
        payload: any
      ) => {
        count++;
        items.push({
          id: `change-${Date.now()}-${count}`,
          section,
          type,
          title,
          details,
          dataPayload: payload,
          enabled: true,
          isEditing: false
        });
      };

      // 1. Competencies
      if (parsed.competencies) {
        (parsed.competencies.additions || []).forEach((item: any) => {
          const name = typeof item === 'string' ? item : (item.name || 'New Competency');
          addChange('competencies', 'addition', `Add Competency: ${name}`, item.note || item.type || 'New skill fact', item);
        });
        (parsed.competencies.modifications || []).forEach((item: any) => {
          const name = typeof item === 'string' ? item : (item.name || 'Competency Update');
          addChange('competencies', 'modification', `Modify Competency: ${name}`, item.note || `Status: ${item.status || 'Updated'}`, item);
        });
        (parsed.competencies.deletions || []).forEach((item: any) => {
          const name = typeof item === 'string' ? item : item.name;
          addChange('competencies', 'deletion', `Delete Competency: ${name}`, 'Remove from learner competencies list', item);
        });
      }

      // 2. Personal Information
      if (parsed.personalInformation) {
        const pi = parsed.personalInformation;
        if (pi.additions) {
          (pi.additions.interests || []).forEach((interest: string) => {
            addChange('personalInformation', 'addition', `Add Interest: ${interest}`, 'New learner interest', { field: 'interests', value: interest });
          });
          (pi.additions.goals || []).forEach((goal: string) => {
            addChange('personalInformation', 'addition', `Add Goal: ${goal}`, 'New personal goal', { field: 'goals', value: goal });
          });
        }
        if (pi.modifications) {
          Object.entries(pi.modifications).forEach(([field, val]) => {
            if (val) {
              addChange('personalInformation', 'modification', `Update ${field}: ${String(val)}`, `Change ${field} field`, { field, value: val });
            }
          });
        }
        if (pi.deletions) {
          (pi.deletions.interests || []).forEach((interest: string) => {
            addChange('personalInformation', 'deletion', `Remove Interest: ${interest}`, 'Remove interest', { field: 'interests', value: interest });
          });
          (pi.deletions.goals || []).forEach((goal: string) => {
            addChange('personalInformation', 'deletion', `Remove Goal: ${goal}`, 'Remove goal', { field: 'goals', value: goal });
          });
        }
      }

      // 3. Needs, Wants & Expectations
      if (parsed.needsWantsExpectations) {
        const nwe = parsed.needsWantsExpectations;
        if (nwe.additions) {
          (nwe.additions.needs || []).forEach((item: any) => {
            const name = typeof item === 'string' ? item : (item.name || 'New Need');
            addChange('needsWantsExpectations', 'addition', `Add Need: ${name}`, item.description || `Priority: ${item.priority || 'medium'}`, item);
          });
          (nwe.additions.wants || []).forEach((want: string) => {
            addChange('needsWantsExpectations', 'addition', `Add Want: ${want}`, 'New learner want', { field: 'wants', value: want });
          });
          (nwe.additions.expectations || []).forEach((exp: string) => {
            addChange('needsWantsExpectations', 'addition', `Add Expectation: ${exp}`, 'New expectation item', { field: 'expectations', value: exp });
          });
        }
        if (nwe.modifications) {
          if (nwe.modifications.expectations) {
            addChange('needsWantsExpectations', 'modification', `Update Expectations`, String(nwe.modifications.expectations), { field: 'expectations', value: nwe.modifications.expectations });
          }
        }
        if (nwe.deletions) {
          (nwe.deletions.needs || []).forEach((item: any) => {
            const name = typeof item === 'string' ? item : item;
            addChange('needsWantsExpectations', 'deletion', `Delete Need: ${name}`, 'Remove need item', item);
          });
        }
      }

      // 4. Course Plan
      if (parsed.coursePlan) {
        const cp = parsed.coursePlan;
        if (cp.additions) {
          (cp.additions.modules || []).forEach((mod: any) => {
            const title = typeof mod === 'string' ? mod : (mod.title || 'New Module');
            addChange('coursePlan', 'addition', `Add Course Module: ${title}`, `Topics: ${(mod.topics || []).join(', ') || 'General'}`, mod);
          });
        }
        if (cp.modifications) {
          if (cp.modifications.courseName) {
            addChange('coursePlan', 'modification', `Update Course Title: ${cp.modifications.courseName}`, 'Course name update', { field: 'courseName', value: cp.modifications.courseName });
          }
          if (cp.modifications.targetLevel) {
            addChange('coursePlan', 'modification', `Update Target Level: ${cp.modifications.targetLevel}`, 'Target level update', { field: 'targetLevel', value: cp.modifications.targetLevel });
          }
        }
        if (cp.deletions) {
          (cp.deletions.modules || []).forEach((mod: any) => {
            const title = typeof mod === 'string' ? mod : mod;
            addChange('coursePlan', 'deletion', `Remove Course Module: ${title}`, 'Delete module from course plan', mod);
          });
        }
      }

      // 5. Feedback (Facts)
      if (parsed.feedbackFacts) {
        const ff = parsed.feedbackFacts;
        if (ff.additions) {
          (ff.additions.strengths || []).forEach((str: string) => {
            addChange('feedbackFacts', 'addition', `Add Strength: ${str}`, 'New observed strength', { field: 'strengths', value: str });
          });
          (ff.additions.improvements || []).forEach((imp: string) => {
            addChange('feedbackFacts', 'addition', `Add Area to Improve: ${imp}`, 'New improvement area', { field: 'improvements', value: imp });
          });
          (ff.additions.factualNotes || []).forEach((fn: string) => {
            addChange('feedbackFacts', 'addition', `Add Fact Observation: ${fn}`, 'Factual note from session', { field: 'factualNotes', value: fn });
          });
        }
        if (ff.modifications) {
          if (ff.modifications.tutorNotes) {
            addChange('feedbackFacts', 'modification', `Update Tutor Observation Notes`, String(ff.modifications.tutorNotes), { field: 'tutorNotes', value: ff.modifications.tutorNotes });
          }
        }
        if (ff.deletions) {
          (ff.deletions.factualNotes || []).forEach((fn: string) => {
            addChange('feedbackFacts', 'deletion', `Remove Fact Observation: ${fn}`, 'Remove outdated factual note', { field: 'factualNotes', value: fn });
          });
        }
      }

      if (items.length === 0) {
        // Fallback: If JSON had general structure or unexpected keys, convert top-level key/values
        Object.entries(parsed).forEach(([key, val]) => {
          if (val && typeof val === 'object') {
            addChange('feedbackFacts', 'addition', `Update Fact (${key})`, JSON.stringify(val), { key, val });
          }
        });
      }

      setChangeItems(items);
      setActiveStep('review');
    } catch (e: any) {
      setParseError(`JSON Parsing Error: ${e.message || 'Invalid format'}. Please ensure response is valid JSON.`);
    }
  };

  // Toggle item enabled
  const toggleItemEnabled = (id: string) => {
    setChangeItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  // Remove change item from review list
  const deleteChangeItem = (id: string) => {
    setChangeItems(prev => prev.filter(item => item.id !== id));
  };

  // Update item details
  const updateItemDetails = (id: string, newTitle: string, newDetails: string) => {
    setChangeItems(prev => prev.map(item => item.id === id ? { ...item, title: newTitle, details: newDetails, isEditing: false } : item));
  };

  // Add custom manual change item
  const handleAddCustomChange = (section: ProfileChangeItem['section']) => {
    const newItem: ProfileChangeItem = {
      id: `change-custom-${Date.now()}`,
      section,
      type: 'addition',
      title: `Custom ${SECTION_LABELS[section].label} Fact`,
      details: 'Enter description or fact update here...',
      dataPayload: {},
      enabled: true,
      isEditing: true
    };
    setChangeItems(prev => [...prev, newItem]);
  };

  // Apply accepted updates to learner profile
  const handleApplyUpdates = () => {
    const enabledItems = changeItems.filter(i => i.enabled);
    if (enabledItems.length === 0) {
      alert('No changes are selected to apply.');
      return;
    }

    let updated: Learner = JSON.parse(JSON.stringify(learner));
    if (!updated.facts) updated.facts = {};
    if (!updated.competencies) updated.competencies = [];
    if (!updated.needs) updated.needs = [];
    if (!updated.goals) updated.goals = [];

    enabledItems.forEach(item => {
      const payload = item.dataPayload || {};

      // SECTION 1: COMPETENCIES
      if (item.section === 'competencies') {
        if (item.type === 'addition') {
          const compName = payload.name || item.title.replace('Add Competency: ', '');
          const existing = updated.competencies.find(c => c.name.toLowerCase() === compName.toLowerCase());
          if (!existing) {
            updated.competencies.push({
              id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: compName,
              type: payload.type || 'grammar',
              status: payload.status || 'Learning',
              progress: 25, // Default baseline without forcing numerical jump
              history: [{ date: new Date().toISOString().split('T')[0], score: 25, note: item.details }]
            });
          }
        } else if (item.type === 'modification') {
          const compName = payload.name || item.title.replace('Modify Competency: ', '');
          const idx = updated.competencies.findIndex(c => c.name.toLowerCase() === compName.toLowerCase());
          if (idx >= 0) {
            updated.competencies[idx] = {
              ...updated.competencies[idx],
              status: payload.status || updated.competencies[idx].status,
              history: [
                ...(updated.competencies[idx].history || []),
                { date: new Date().toISOString().split('T')[0], score: updated.competencies[idx].progress, note: item.details }
              ]
            };
          }
        } else if (item.type === 'deletion') {
          const compName = typeof payload === 'string' ? payload : (payload.name || item.title.replace('Delete Competency: ', ''));
          updated.competencies = updated.competencies.filter(c => c.name.toLowerCase() !== compName.toLowerCase());
        }
      }

      // SECTION 2: PERSONAL INFORMATION
      if (item.section === 'personalInformation') {
        if (payload.field === 'interests') {
          if (item.type === 'addition') {
            const currentInterests = updated.interests ? updated.interests.split(',').map(s => s.trim()) : [];
            if (!currentInterests.includes(payload.value)) currentInterests.push(payload.value);
            updated.interests = currentInterests.join(', ');
          } else if (item.type === 'deletion') {
            const currentInterests = updated.interests ? updated.interests.split(',').map(s => s.trim()) : [];
            updated.interests = currentInterests.filter(i => i.toLowerCase() !== payload.value.toLowerCase()).join(', ');
          }
        } else if (payload.field === 'goals') {
          if (item.type === 'addition') {
            if (!updated.goals.includes(payload.value)) updated.goals.push(payload.value);
          } else if (item.type === 'deletion') {
            updated.goals = updated.goals.filter(g => g.toLowerCase() !== payload.value.toLowerCase());
          }
        } else if (payload.field) {
          (updated as any)[payload.field] = payload.value;
        } else {
          updated.notes = (updated.notes ? updated.notes + '\n\n' : '') + `${item.title}: ${item.details}`;
        }
      }

      // SECTION 3: NEEDS, WANTS & EXPECTATIONS
      if (item.section === 'needsWantsExpectations') {
        if (item.type === 'addition' && payload.name) {
          const needName = payload.name;
          const existing = updated.needs.find(n => n.name.toLowerCase() === needName.toLowerCase());
          if (!existing) {
            updated.needs.push({
              id: `need-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: needName,
              priority: payload.priority || 'medium',
              status: 'identified',
              rating: 3,
              description: item.details
            });
          }
        } else if (payload.field === 'expectations') {
          updated.expectations = payload.value || item.details;
        } else if (payload.field === 'wants') {
          if (!updated.facts.wants) updated.facts.wants = [];
          if (!updated.facts.wants.includes(payload.value)) updated.facts.wants.push(payload.value);
        } else if (item.type === 'deletion') {
          const needName = typeof payload === 'string' ? payload : (payload.name || item.title.replace('Delete Need: ', ''));
          updated.needs = updated.needs.filter(n => n.name.toLowerCase() !== needName.toLowerCase());
        }
      }

      // SECTION 4: COURSE PLAN
      if (item.section === 'coursePlan') {
        if (!updated.coursePlan) {
          updated.coursePlan = { id: `cp-${Date.now()}`, courseName: 'General Course', modules: [] };
        }
        if (payload.field === 'courseName') {
          updated.coursePlan.courseName = payload.value;
        } else if (payload.field === 'targetLevel') {
          updated.coursePlan.targetLevel = payload.value;
        } else if (item.type === 'addition' && payload.title) {
          if (!updated.coursePlan.modules) updated.coursePlan.modules = [];
          updated.coursePlan.modules.push({
            id: `mod-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            title: payload.title,
            topics: payload.topics || [],
            status: 'pending'
          });
        } else if (item.type === 'deletion') {
          const modTitle = typeof payload === 'string' ? payload : (payload.title || item.title.replace('Remove Course Module: ', ''));
          if (updated.coursePlan.modules) {
            updated.coursePlan.modules = updated.coursePlan.modules.filter(m => m.title.toLowerCase() !== modTitle.toLowerCase());
          }
        }
      }

      // SECTION 5: FEEDBACK (FACTS)
      if (item.section === 'feedbackFacts') {
        if (payload.field === 'strengths') {
          if (!updated.facts.strengths) updated.facts.strengths = [];
          if (!updated.facts.strengths.includes(payload.value)) updated.facts.strengths.push(payload.value);
        } else if (payload.field === 'improvements') {
          if (!updated.facts.improvements) updated.facts.improvements = [];
          if (!updated.facts.improvements.includes(payload.value)) updated.facts.improvements.push(payload.value);
        } else if (payload.field === 'factualNotes') {
          if (!updated.facts.factualNotes) updated.facts.factualNotes = [];
          if (item.type === 'addition' && !updated.facts.factualNotes.includes(payload.value)) {
            updated.facts.factualNotes.push(payload.value);
          } else if (item.type === 'deletion') {
            updated.facts.factualNotes = updated.facts.factualNotes.filter((fn: string) => fn.toLowerCase() !== payload.value.toLowerCase());
          }
        } else if (payload.field === 'tutorNotes') {
          updated.notes = payload.value;
        } else {
          updated.notes = (updated.notes ? updated.notes + '\n\n' : '') + `[Fact Update] ${item.title}: ${item.details}`;
        }
      }
    });

    onUpdate(updated);
    alert(`Successfully updated profile facts for ${learner.name}!`);
    handleClose();
  };

  // Filter items by section
  const filteredItems = changeItems.filter(item => {
    if (selectedSectionFilter === 'all') return true;
    return item.section === selectedSectionFilter;
  });

  const totalEnabled = changeItems.filter(i => i.enabled).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Update Profile: ${learner.name}`}
      size="full"
    >
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

        {/* STEP 1 & 2 INPUT VIEW */}
        {activeStep === 'input' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Action Bar & Quick Copy Prompt */}
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900">
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <i className="fas fa-sliders-h text-emerald-400"></i> Update Profile Facts Engine
                </h3>
                <p className="text-indigo-100 text-xs mt-1 dark:text-slate-300">
                  Update Competency Overview, Personal Information, Needs & Wants, Course Plan, and Feedback (Facts).
                </p>
              </div>

              <button
                onClick={handleCopyPrompt}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all ${
                  isCopied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:-translate-y-0.5'
                }`}
              >
                <i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'}`}></i>
                {isCopied ? 'Master Prompt Copied!' : 'Copy Master Prompt'}
              </button>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl text-red-800 text-xs font-semibold flex justify-between items-center">
                <span><i className="fas fa-exclamation-triangle mr-2"></i>{parseError}</span>
                <button onClick={() => setParseError(null)} className="text-red-600 hover:text-red-900">&times;</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Textbox 1: Learner Transcript / Notes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <i className="fas fa-comment-alt text-brand-blue"></i>
                    1. Learner Session Transcript / Notes
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Optional</span>
                </div>
                <textarea
                  className="w-full h-72 p-4 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-brand-blue focus:border-brand-blue shadow-inner"
                  placeholder="Paste your learner's session transcript, conversation record, or tutor observations here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>

              {/* Textbox 2: Paste Generated JSON */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <i className="fas fa-code text-purple-600"></i>
                    2. Paste Generated JSON Code
                  </label>
                  <span className="text-[11px] font-bold text-purple-600 uppercase">Required</span>
                </div>
                <textarea
                  className="w-full h-72 p-4 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-inner"
                  placeholder='Paste the generated JSON code here... (e.g. { "competencies": { ... }, "personalInformation": { ... } })'
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => parseJsonToChangeItems(jsonInput)}
                disabled={!jsonInput.trim()}
                className="px-8 py-3 rounded-xl font-extrabold bg-brand-green hover:bg-emerald-600 text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <i className="fas fa-search-plus"></i> Review & Edit Profile Changes
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 REVIEW SCREEN */}
        {activeStep === 'review' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header summary bar */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                  <i className="fas fa-check-circle text-emerald-600"></i> Profile Changes Extracted
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Review additions, modifications, and deletions for {learner.name}. You can edit, remove, or add new items before updating.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3.5 py-1.5 rounded-xl border shadow-sm">
                <span>Selected: <strong className="text-brand-green">{totalEnabled}</strong> / {changeItems.length} changes</span>
              </div>
            </div>

            {/* Section Filters */}
            <div className="flex border-b border-slate-200 overflow-x-auto gap-1 pb-1">
              <button
                onClick={() => setSelectedSectionFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  selectedSectionFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Sections ({changeItems.length})
              </button>

              {Object.entries(SECTION_LABELS).map(([secKey, meta]) => {
                const secCount = changeItems.filter(i => i.section === secKey).length;
                return (
                  <button
                    key={secKey}
                    onClick={() => setSelectedSectionFilter(secKey)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedSectionFilter === secKey
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <i className={`fas ${meta.icon}`}></i>
                    {meta.label} ({secCount})
                  </button>
                );
              })}
            </div>

            {/* List of proposed changes by section */}
            <div className="space-y-6">
              {Object.entries(SECTION_LABELS)
                .filter(([secKey]) => selectedSectionFilter === 'all' || selectedSectionFilter === secKey)
                .map(([secKey, meta]) => {
                  const itemsInSection = changeItems.filter(i => i.section === secKey);

                  return (
                    <div key={secKey} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      
                      {/* Section Title Header */}
                      <div className="flex justify-between items-center border-b pb-3">
                        <div className="flex items-center gap-2 font-extrabold text-slate-800 text-sm">
                          <i className={`fas ${meta.icon} text-${meta.color}-600 text-base`}></i>
                          <span>{meta.label}</span>
                          <span className="text-xs font-bold text-slate-400">({itemsInSection.length} items)</span>
                        </div>

                        <button
                          onClick={() => handleAddCustomChange(secKey as ProfileChangeItem['section'])}
                          className="text-xs font-bold text-brand-blue hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                        >
                          <i className="fas fa-plus"></i> Add Custom Fact
                        </button>
                      </div>

                      {/* Items */}
                      {itemsInSection.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No updates recorded for this section.</p>
                      ) : (
                        <div className="space-y-3">
                          {itemsInSection.map(item => (
                            <div
                              key={item.id}
                              className={`p-3.5 rounded-xl border text-xs transition-all space-y-2 ${
                                !item.enabled
                                  ? 'bg-slate-50 opacity-50 border-slate-200'
                                  : item.type === 'addition'
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : item.type === 'modification'
                                  ? 'bg-amber-50/60 border-amber-200'
                                  : 'bg-red-50/60 border-red-200'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-3">
                                
                                {/* Checkbox & Badge */}
                                <div className="flex items-center gap-2.5 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={item.enabled}
                                    onChange={() => toggleItemEnabled(item.id)}
                                    className="h-4 w-4 rounded text-brand-green focus:ring-brand-green cursor-pointer"
                                  />

                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                      item.type === 'addition'
                                        ? 'bg-emerald-200 text-emerald-800'
                                        : item.type === 'modification'
                                        ? 'bg-amber-200 text-amber-900'
                                        : 'bg-red-200 text-red-900'
                                    }`}
                                  >
                                    {item.type === 'addition' ? '+ Addition' : item.type === 'modification' ? '~ Modification' : '- Deletion'}
                                  </span>

                                  {/* Title / Inline Editable Title */}
                                  {item.isEditing ? (
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => updateItemDetails(item.id, e.target.value, item.details)}
                                      className="font-bold text-slate-800 border rounded px-2 py-1 text-xs w-full"
                                    />
                                  ) : (
                                    <span className="font-extrabold text-slate-800 text-xs">{item.title}</span>
                                  )}
                                </div>

                                {/* Controls: Edit / Delete */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setChangeItems(prev =>
                                        prev.map(i => (i.id === item.id ? { ...i, isEditing: !i.isEditing } : i))
                                      )
                                    }
                                    className="text-slate-500 hover:text-slate-800 px-2 py-1 text-[11px] font-bold"
                                    title="Edit change item"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>

                                  <button
                                    onClick={() => deleteChangeItem(item.id)}
                                    className="text-red-500 hover:text-red-700 px-2 py-1 text-[11px]"
                                    title="Remove change item"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                                </div>
                              </div>

                              {/* Details / Inline Editable Details */}
                              {item.isEditing ? (
                                <textarea
                                  value={item.details}
                                  onChange={(e) => updateItemDetails(item.id, item.title, e.target.value)}
                                  className="w-full border rounded p-2 text-xs text-slate-700 font-mono"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-slate-600 pl-8 text-xs leading-relaxed whitespace-pre-line">
                                  {item.details}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Bottom Controls */}
            <div className="flex justify-between items-center border-t pt-4">
              <button
                onClick={() => setActiveStep('input')}
                className="px-5 py-2.5 rounded-xl font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all"
              >
                <i className="fas fa-arrow-left"></i> Re-paste JSON / Transcript
              </button>

              <button
                onClick={handleApplyUpdates}
                disabled={totalEnabled === 0}
                className="px-8 py-3 rounded-xl font-extrabold bg-brand-green hover:bg-emerald-600 text-white shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-40"
              >
                <i className="fas fa-check-circle"></i> Update Profile
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default UpdateProfileModal;
