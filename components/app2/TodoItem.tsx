import React, { memo } from 'react';
import { Todo } from '../../types2';
import { format, isPast, isToday } from 'date-fns';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onRemove }) => {
  const priorityStyles = {
    Low: 'bg-blue-100 text-blue-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    High: 'bg-red-100 text-red-800',
  };

  const getDueDateText = () => {
    if (!todo.dueDate) return null;
    const date = new Date(`${todo.dueDate}T00:00:00`);
    if (isToday(date)) return "Today";
    if (isPast(date) && !todo.completed) return "Overdue";
    return format(date, 'MMM d');
  };

  const dueDateText = getDueDateText();
  const isOverdue = dueDateText === "Overdue";

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${todo.completed ? 'bg-green-50' : 'bg-white border'}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-6 w-6 rounded border-gray-300 text-brand-green focus:ring-brand-green cursor-pointer flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${todo.completed ? 'line-through text-brand-gray-medium' : 'text-brand-gray-darkest'}`}>
          {todo.text}
        </p>
        <div className="flex items-center gap-3 text-xs mt-1">
            <p className="text-brand-purple font-bold">{todo.learnerName || todo.groupName}</p>
            {todo.priority && (
                <span className={`px-2 py-0.5 font-bold rounded-full ${priorityStyles[todo.priority]}`}>
                    <i className="fas fa-flag mr-1"></i>
                    {todo.priority}
                </span>
            )}
            {dueDateText && (
                <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    <i className="fas fa-calendar-alt mr-1"></i>
                    {dueDateText}
                </span>
            )}
        </div>
      </div>
      <button onClick={() => onRemove(todo.id)} className="text-brand-red hover:text-red-700 font-bold text-2xl px-2 flex-shrink-0">&times;</button>
    </div>
  );
};

export default memo(TodoItem);