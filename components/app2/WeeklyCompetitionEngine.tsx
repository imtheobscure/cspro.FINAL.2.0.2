import React, { useEffect } from 'react';
import { useLearnerStore } from '../../store/useLearnerStore';

/**
 * Keeps the Weekly Competition self-running.
 *
 * Mounted once in the app shell (DashboardLayout). Whenever the app loads or
 * a minute ticks past the weekly deadline (Sunday 23:59), the store's
 * `ensureCompetitionRound` rolls the round over: it settles any still-active
 * mutual pair from the week that just ended (winner auto-awarded +100 XP and a
 * Week record computed from the 7-day stats), then re-pairs opted-in learners
 * two-by-two inside their category for the new week.
 */
const WeeklyCompetitionEngine: React.FC = () => {
    useEffect(() => {
        const ensure = () => {
            try {
                useLearnerStore.getState().ensureCompetitionRound();
            } catch (err) {
                console.warn('Weekly Competition rollover failed:', err);
            }
        };

        // Run immediately (covers the app being closed over the deadline), then each minute.
        ensure();
        const timer = window.setInterval(ensure, 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    return null;
};

export default WeeklyCompetitionEngine;
