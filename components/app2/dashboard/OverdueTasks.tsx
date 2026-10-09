import React from 'react';
import { useTodoStore } from '../../../store/useTodoStore';
import { useAppStore } from '../../../store/useAppStore';
import { useLearnerStore } from '../../../store/useLearnerStore';
import { isPast, format } from 'date-fns';
import SectionCard from '../SectionCard';
import { Todo } from '../../../types2';

const OverdueTasks: React.FC = () => {
    const todos = useTodoStore(state => state.todos);
    const tutorInfo = useAppStore(state => state.tutorInfo);
    const learners = useLearnerStore(state => state.learners);
    
    const overdueTasks = (todos || []).filter(
        todo => todo.dueDate && isPast(new Date(`${todo.dueDate}T23:59:59`)) && !todo.completed
    ).sort((a,b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    if (overdueTasks.length === 0) {
        return null; 
    }

    const handleSendReminder = (todo: Todo) => {
        let recipientEmail = '';
        if (todo.learnerId) {
            const learner = learners.find(l => l.id === todo.learnerId);
            recipientEmail = learner?.email || '';
        }

        const subject = `Overdue Task Reminder: ${todo.text}`;
        const body = `
Hi ${todo.learnerName || todo.groupName || ''},

This is a friendly reminder that the following task is overdue:

Task: ${todo.text}
Due Date: ${todo.dueDate ? format(new Date(`${todo.dueDate}T00:00:00`), 'PPP') : 'N/A'}

Please complete it as soon as possible.

Best,
${tutorInfo.name}
        `.trim();

        const mailtoLink = `mailto:${recipientEmail}?cc=${tutorInfo.email}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.open(mailtoLink, '_blank');
    };

    return (
        <SectionCard title="Overdue Tasks 📮" icon={<span>📮</span>}>
            <div className="space-y-3">
                {overdueTasks.map(todo => (
                    <div key={todo.id} className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <p className="font-bold text-red-800">{todo.text}</p>
                            <p className="text-sm text-red-600">
                                For: {todo.learnerName || todo.groupName} | Due: {todo.dueDate}
                            </p>
                        </div>
                        <button
                            onClick={() => handleSendReminder(todo)}
                            className="bg-red-500 text-white font-bold py-1 px-3 rounded-lg text-sm hover:bg-red-600 flex-shrink-0"
                            title="Open email client to send reminder"
                        >
                            Remind
                        </button>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

export default OverdueTasks;
