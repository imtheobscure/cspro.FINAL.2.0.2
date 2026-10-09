import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Todo } from '../types2';
import { mockTodos } from '../data/mockData';
import { idbZustandStorage } from '../utils/storageAdapter';

interface TodoState {
    todos: Todo[];
    addTodo: (todo: Omit<Todo, 'id'>) => void;
    toggleTodo: (id: string) => void;
    removeTodo: (id: string) => void;
    cleanup: () => void;
}

export const useTodoStore = create<TodoState>()(
    persist(
        (set) => ({
            todos: mockTodos,
            
            addTodo: (todo) => set(state => ({ todos: [{ ...todo, id: `t${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }, ...state.todos] })),

            toggleTodo: (id) => set(state => ({ todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })),
            
            removeTodo: (id) => set(state => ({ todos: state.todos.filter(t => t.id !== id) })),

            cleanup: () => set(state => {
                const uniqueIds = new Set();
                const uniqueTodos = [];
                for (const todo of state.todos) {
                    if (!uniqueIds.has(todo.id)) {
                        uniqueIds.add(todo.id);
                        uniqueTodos.push(todo);
                    }
                }
                return { todos: uniqueTodos };
            }),
        }),
        {
            name: 'todo-storage',
            storage: createJSONStorage(() => idbZustandStorage),
            partialize: (state) => ({
                todos: (state.todos || []).map(t => ({
                    ...t,
                    text: t.text && t.text.length > 1000 ? t.text.substring(0, 1000) + '...' : t.text,
                })),
            }),
            onRehydrateStorage: () => (state) => {
                state?.cleanup();
            }
        }
    )
);
