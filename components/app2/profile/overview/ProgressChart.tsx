import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Session, Competency } from '../../../../types2';

const ProgressChart: React.FC<{ sessions: Session[], competencies: Competency[] }> = ({ sessions, competencies }) => {
    const chartData = useMemo(() => {
        if (competencies.length === 0) return [];
        const attendedSessions = sessions.filter(s => s.attended).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (attendedSessions.length < 2) return [];

        let currentProgress: { [key: string]: number } = {};
        competencies.forEach(c => {
            currentProgress[c.id] = c.initialProgress;
        });

        return attendedSessions.map(session => {
            const dataPoint: { [key: string]: any } = {
                date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
            
            competencies.forEach((c, index) => {
                // Simulate progress: each session adds a small deterministic amount
                // Use a pseudo-random value based on session date and competency ID to be deterministic
                const pseudoRandom = (session.date.charCodeAt(session.date.length - 1) + c.id.charCodeAt(0)) % 3;
                currentProgress[c.id] = Math.min(100, currentProgress[c.id] + (pseudoRandom + 0.5));
                dataPoint[c.name] = Math.round(currentProgress[c.id]);
            });
            return dataPoint;
        });
    }, [sessions, competencies]);

    if (chartData.length < 2) {
        return <p className="text-center text-gray-500 p-4">Not enough session data to display a progress trend. At least two attended sessions are needed.</p>;
    }
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {competencies.map((c, index) => (
                    <Line key={c.id} type="monotone" dataKey={c.name} stroke={colors[index % colors.length]} strokeWidth={2} activeDot={{ r: 8 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

export default ProgressChart;