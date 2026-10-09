import React from 'react';
import { GroupClass, Learner } from '../../../../types2';
import { ICONS } from '../../../../constants2';
import { getAvatarUrl } from '../../../../services/avatarService';
import StarRating from '../../StarRating';

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3 print:break-inside-avoid">
        <span className="text-brand-gray-dark mt-1 w-5 h-5 flex items-center justify-center">{icon}</span>
        <div>
            <p className="text-sm text-brand-gray-dark">{label}</p>
            <div className="font-bold">{value || 'N/A'}</div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; icon: React.ReactElement; children: React.ReactNode; }> = ({ title, icon, children }) => (
     <div className="border border-gray-200 rounded-lg p-4 print:shadow-none print:border-gray-300 print:break-inside-avoid h-full">
        <div className="flex items-center gap-3 mb-4">
            {icon && <span className="text-brand-green">{React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}</span>}
            <h3 className="text-xl font-extrabold text-brand-gray-darkest">{title}</h3>
        </div>
        <div>{children}</div>
    </div>
);

const PrintableGroupOverview: React.FC<{ group: GroupClass; participants: Learner[] }> = ({ group, participants }) => {
    const { coursePlan } = group;
    const coursePlanLabels = {
        duration: {30: '30m - Quick Drills', 60: '60m - Standard', 90: '90m - In-Depth', 120: '120m - Intensive'},
        frequency: {Light: '1x/wk - Light', Balanced: '2x/wk - Balanced', Intensive: '3x/wk - Intensive', Custom: 'Flex - Custom'},
    };

    return (
        <div className="bg-white p-6">
             <div className="text-center mb-6">
                <div className="relative h-24 w-48 flex items-center justify-center mx-auto mb-4">
                    {participants.slice(0, 3).map((p, index) => (
                        <img key={p.id} src={getAvatarUrl(p.gender, p.avatarId, p.name)} alt={p.name} className="w-16 h-16 rounded-full border-4 border-white shadow-lg absolute object-cover"
                             style={{ zIndex: 3 - index, transform: `translateX(${(index - 1) * 30}px)` }} />
                    ))}
                </div>
                <h2 className="text-3xl font-extrabold">{group.name} Overview</h2>
                <p className="text-gray-500">{participants.length} Learner{participants.length === 1 ? '' : 's'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Section title="Participants" icon={<i className="fas fa-users"></i>}>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {participants.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                                <img src={getAvatarUrl(p.gender, p.avatarId, p.name)} className="w-8 h-8 rounded-full"/>
                                <div>
                                    <p className="font-semibold text-sm">{p.name}</p>
                                    <p className="text-xs text-gray-500">{p.occupation}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
                 <Section title="Course Plan" icon={ICONS.calendar}>
                    <div className="grid grid-cols-1 gap-3">
                        <InfoItem icon={<span>🎯</span>} label="Current Level" value={coursePlan.level} />
                        <InfoItem icon={<span>🚀</span>} label="Target Level" value={coursePlan.targetLevel} />
                        <InfoItem icon={<span>⚡</span>} label="Course Name" value={coursePlan.courseName} />
                        <InfoItem icon={<span>⏳</span>} label="Duration" value={coursePlanLabels.duration[coursePlan.duration as keyof typeof coursePlanLabels.duration]} />
                        <InfoItem icon={<span>🔄</span>} label="Frequency" value={coursePlanLabels.frequency[coursePlan.frequency as keyof typeof coursePlanLabels.frequency]} />
                    </div>
                </Section>
            </div>
             <Section title="Group Needs & Expectations" icon={ICONS.target}>
                 <div className="mb-4">
                    <h4 className="font-bold text-base mb-2 text-brand-gray-darkest">Expectations</h4>
                    {group.expectations && group.expectations.trim() ? (
                        <p className="text-sm text-gray-700">{group.expectations}</p>
                    ) : <p className="text-sm text-brand-gray-dark">No expectations set.</p>}
                </div>

                 <div className="border-t border-brand-gray-light pt-4 mt-4">
                     <h4 className="font-bold text-base mb-2 text-brand-gray-darkest">Needs Assessment</h4>
                    <div className="space-y-2">
                        {(group.needs || []).map(need => (
                            <div key={need.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                <span className="font-medium">{need.name}</span>
                                <StarRating rating={need.rating} />
                            </div>
                        ))}
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default PrintableGroupOverview;
