import React from 'react';

export const ICONS: Record<string, React.ReactElement> = {
    'calendar': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    'user': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    'email': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
    'phone': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
    'globe': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    'message': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    'briefcase': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    'graduation': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"></path></svg>,
    'target': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    'listening': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 2v2M20 12h2M4 12H2M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41"></path><path d="M20 4.93l-1.41 1.41M4.93 4.93l1.41 1.41"></path></svg>,
    'speaking': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>,
    'reading': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
    'writing': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
    'fire': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>,
    'sparkles': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path><path d="M18 9h.01"></path><path d="M15 6h.01"></path><path d="M19.5 13.5h.01"></path><path d="M21 12a6 6 0 0 0-9-9 9 9 0 0 0-9 9"></path></svg>,
    'plus': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    'leaderboard': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20V16"/></svg>,
    'gender': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 16.5c-3.14.14-5.5 2.64-5.5 5.5m15-5.5c0 2.86-2.36 5.36-5.5 5.5M12 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"/></svg>,
    'refresh': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
    'speaker': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>,
};

export const FIXED_BADGES = [
    { name: 'On Time', description: 'Learner is on time for the session.', icon: 'fas fa-clock' },
    { name: 'Ready!', description: 'Learner has studied the content before class.', icon: 'fas fa-book-open-reader' },
    { name: 'Speaks Alot!', description: 'Great job on speaking time!', icon: 'fas fa-comments' },
    { name: 'Homework Hero', description: 'For completing homework assignments.', icon: 'fas fa-pencil-alt' },
    { name: 'Dedicated', description: 'Books classes regularly and shows commitment.', icon: 'fas fa-calendar-check' }
];

export const FIXED_PENALTIES = [
    { name: 'Late, Late, Late!', icon: 'fas fa-exclamation-triangle' },
    { name: 'Not ready!', icon: 'fas fa-times-circle' },
    { name: 'Distracted!', icon: 'fas fa-ghost' }
];

export const INTEREST_OPTIONS = [
    { label: "Technology", emoji: "💻" },
    { label: "Art & Design", emoji: "🎨" },
    { label: "Science", emoji: "🔬" },
    { label: "History", emoji: "📜" },
    { label: "Travel", emoji: "✈️" },
    { label: "Food & Cooking", emoji: "🍔" },
    { label: "Music", emoji: "🎵" },
    { label: "Movies & TV Shows", emoji: "🎬" },
    { label: "Gaming", emoji: "🎮" },
    { label: "Sports", emoji: "⚽" },
    { label: "Fashion", emoji: "👗" },
    { label: "Fitness & Health", emoji: "💪" },
    { label: "Reading", emoji: "📚" },
    { label: "Writing", emoji: "✍️" },
    { label: "Photography", emoji: "📷" },
    { label: "Nature & Outdoors", emoji: "🌲" },
    { label: "Animals & Pets", emoji: "🐾" },
    { label: "Gardening", emoji: "🌱" },
    { label: "Dancing", emoji: "💃" },
    { label: "Theater & Performing Arts", emoji: "🎭" },
    { label: "Space & Astronomy", emoji: "🚀" },
    { label: "Psychology", emoji: "🧠" },
    { label: "Philosophy", emoji: "🤔" },
    { label: "Languages", emoji: "🗣️" },
    { label: "Geography", emoji: "🗺️" },
    { label: "Politics & Current Events", emoji: "🏛️" },
];

export const EXPECTATION_OPTIONS = [
    { label: "Energetic", emoji: "⚡️" },
    { label: "Serious", emoji: "🧐" },
    { label: "Fun", emoji: "😂" },
    { label: "On time", emoji: "⏰" },
    { label: "Give homework", emoji: "✍️" },
    { label: "Not to give homework", emoji: "🙅‍♀️" },
    { label: "Patient", emoji: "🤗" },
    { label: "Knowledgeable", emoji: "🧠" },
    { label: "Organized", emoji: "📂" },
    { label: "Approachable", emoji: "😊" },
    { label: "Enthusiastic", emoji: "✨" },
    { label: "Clear communicator", emoji: "💬" },
    { label: "Supportive", emoji: "🙏" },
    { label: "Engaging", emoji: "🎬" },
    { label: "Provides clear feedback", emoji: "🎯" },
    { label: "Respectful", emoji: "🤝" },
];

// FIX: Added LEARNING_STYLE_OPTIONS constant for use in the personal information form.
export const LEARNING_STYLE_OPTIONS = [
    { label: "Visual", emoji: "🖼️" },
    { label: "Auditory", emoji: "🎧" },
    { label: "Kinesthetic", emoji: "🤸" },
    { label: "Reading/Writing", emoji: "✍️" },
];

export const LEARNING_FACTORS = {
    'VARK Styles': {
        color: 'blue',
        guide: "How do you like to learn?",
        items: [
            { label: "Visual", emoji: "🖼️", definition: "I like to see pictures and watch videos to learn." },
            { label: "Auditory", emoji: "🎧", definition: "I like to listen to my teacher and talk about things." },
            { label: "Kinesthetic", emoji: "🤸", definition: "I like to move, play games, and do things with my hands." },
            { label: "Reading/Writing", emoji: "✍️", definition: "I like to read books and write words." },
        ]
    },
    'Gardner\'s Intelligences': {
        color: 'purple',
        guide: "What are you good at?",
        items: [
            { label: "Linguistic", emoji: "🗣️", definition: "I am good at words and speaking." },
            { label: "Logical-Mathematical", emoji: "🧮", definition: "I am good at numbers and puzzles." },
            { label: "Spatial", emoji: "🎨", definition: "I am good at drawing and seeing colors." },
            { label: "Bodily-Kinesthetic", emoji: "🏃", definition: "I am good at sports and moving." },
            { label: "Musical", emoji: "🎵", definition: "I am good at singing and listening to music." },
            { label: "Interpersonal", emoji: "🤝", definition: "I like making friends and talking to people." },
            { label: "Intrapersonal", emoji: "🧘", definition: "I understand my feelings and like to think quietly." },
            { label: "Naturalist", emoji: "🌿", definition: "I love animals, plants, and nature." },
        ]
    },
    'Mental Faculties': {
        color: 'yellow',
        guide: "How does your brain work best?",
        items: [
            { label: "Memory", emoji: "🧠", definition: "I can remember things easily (like new words)." },
            { label: "Logic", emoji: "⚖️", definition: "I like rules and understanding how things work." },
            { label: "Creativity", emoji: "💡", definition: "I like to imagine new things and make stories." },
            { label: "Focus", emoji: "🎯", definition: "I can pay attention for a long time." },
        ]
    },
    'Social-Emotional Learning': {
        color: 'red',
        guide: "How do you feel in English class?",
        items: [
            { label: "Anxiety", emoji: "😥", definition: "I feel nervous or scared when I speak English." },
            { label: "Confidence", emoji: "💪", definition: "I feel brave and sure of myself in class." },
            { label: "Fear of Mistakes", emoji: "😨", definition: "I am scared of saying something wrong." },
            { label: "Motivation", emoji: "🔥", definition: "I really want to learn and do my best!" },
            { label: "Risk-taking", emoji: "🎲", definition: "I like to try to speak, even if I make a mistake." },
        ]
    }
};


export const SPOKEN_LANGUAGE_OPTIONS = [
    { label: "English", emoji: "" },
    { label: "Spanish", emoji: "" },
    { label: "Mandarin Chinese", emoji: "" },
    { label: "Hindi", emoji: "" },
    { label: "Arabic", emoji: "" },
    { label: "Portuguese", emoji: "" },
    { label: "Bengali", emoji: "" },
    { label: "Russian", emoji: "" },
    { label: "Japanese", emoji: "" },
    { label: "German", emoji: "" },
    { label: "French", emoji: "" },
    { label: "Korean", emoji: "" },
    { label: "Turkish", emoji: "" },
    { label: "Italian", emoji: "" },
];

export const LOGO_URL = '';