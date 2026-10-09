import { differenceInYears, addYears, isFuture, isWithinInterval } from 'date-fns';
import { Learner } from '../types2';

export const calculateAge = (birthday?: string): number | null => {
    if (!birthday) return null;
    try {
        return differenceInYears(new Date(), new Date(birthday));
    } catch (error) {
        return null;
    }
};

export const formatBirthday = (birthday?: string): string => {
    if (!birthday) return 'Not set';
    try {
        const date = new Date(birthday);
        // Add a day to counteract timezone issues that might push the date back
        const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        return adjustedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return 'Invalid Date';
    }
};

export const getUpcomingBirthdays = (learners: Learner[], days: number): Learner[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const futureLimit = addYears(today, 1); // Consider birthdays up to a year away

    const learnersWithBirthdays = learners.filter(l => l.birthday);

    const upcoming = learnersWithBirthdays.map(learner => {
        const birthDate = new Date(learner.birthday!);
        let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // If this year's birthday has already passed, check next year's
        if (nextBirthday < today) {
            nextBirthday = addYears(nextBirthday, 1);
        }
        
        return { ...learner, nextBirthday };
    })
    .filter(learner => isFuture(learner.nextBirthday) && learner.nextBirthday < futureLimit)
    .filter(learner => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const interval = { start: yesterday, end: addYears(today, 1) };
        return isWithinInterval(learner.nextBirthday, interval);
    })
    .sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());

    // Further filter for the next 'days'
    const endInterval = new Date(today);
    endInterval.setDate(today.getDate() + days);

    return upcoming.filter(l => l.nextBirthday <= endInterval);
};