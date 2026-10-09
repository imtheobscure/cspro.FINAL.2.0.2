import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBookingStore } from '../../../../store/useBookingStore';
import { useCalendarStore } from '../../../../store/useCalendarStore';
import { useAutomationStore } from '../../../../store/useAutomationStore';
import { format, isPast, isFuture, parseISO, addWeeks, addDays, startOfWeek, differenceInDays, differenceInHours } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Learner {
  id: string;
  name: string;
  email?: string;
  timezone?: string;
}

interface FundLog {
  id: string;
  amount: number;
  reason: string;
  date: string;
  type: 'add' | 'subtract';
}

interface Session {
  id: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled' | 'attended-unpaid';
  notes?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  homeworkAssigned?: string;
  duration?: number;
  cancellationFee?: number;
  cancellationReason?: string;
  deferredInvoiceId?: string;
}

interface Package {
  id: string;
  sessions: number;
  label: string;
  discountPercent: number;
  color: string;
  badge?: string;
}

interface RecurringRule {
  dayOfWeek: number;
  time: string;
  active: boolean;
}

interface SmartReminder {
  id: string;
  type: 'low-balance' | 'session-tomorrow' | 'package-expiring' | 'invoice-overdue' | 'streak';
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  dismissed: boolean;
}

interface PaymentRecord {
  id: string;
  learnerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'deferred';
  dueDate: string;
  description: string;
  invoiceNumber: string;
  sessionId?: string;
  paidAt?: string;
  refundReason?: string;
  isRefund?: boolean;
}

interface CancellationPolicy {
  freeCancellationHours: number;
  halfChargeCancellationHours: number;
}

interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'session' | 'personal' | 'blocked';
}

interface BufferSettings {
  enabled: boolean;
  minutes: number;
}

interface WaitlistEntry {
  id: string;
  date: string;
  time: string;
  requestedAt: string;
  notified: boolean;
}

interface BlockedTime {
  id: string;
  date: string;
  label: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
}

interface RevenueDataPoint {
  label: string;
  revenue: number;
  hours: number;
  sessions: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PACKAGE_DEFS: Package[] = [
  { id: 'single', sessions: 1, label: 'Drop-in', discountPercent: 0, color: '#6366f1' },
  { id: 'five', sessions: 5, label: 'Starter', discountPercent: 5, color: '#0ea5e9', badge: 'Popular' },
  { id: 'ten', sessions: 10, label: 'Pro', discountPercent: 10, color: '#10b981', badge: 'Best Value' },
  { id: 'twenty', sessions: 20, label: 'Intensive', discountPercent: 15, color: '#f59e0b' },
];

const STATUS_CONFIG: Record<Session['status'], { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#0ea5e9', bg: '#e0f2fe' },
  completed: { label: 'Completed', color: '#10b981', bg: '#d1fae5' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
  'no-show': { label: 'No Show', color: '#f59e0b', bg: '#fef3c7' },
  rescheduled: { label: 'Rescheduled', color: '#8b5cf6', bg: '#ede9fe' },
  'attended-unpaid': { label: 'Attended (Unpaid)', color: '#f97316', bg: '#ffedd5' },
};

const MOCK_LEARNER: Learner = { id: '1', name: 'Yuki Tanaka', email: 'yuki@example.com', timezone: 'Asia/Tokyo' };

// ── Utility helpers ───────────────────────────────────────────────────────────

const getCancellationFee = (session: Session, policy: CancellationPolicy, pricePerSession: number): { fee: number; label: string } => {
  const sessionDateTime = parseISO(`${session.date}T${session.time}`);
  const hoursUntil = differenceInHours(sessionDateTime, new Date());
  if (hoursUntil >= policy.freeCancellationHours) return { fee: 0, label: 'Free cancellation' };
  if (hoursUntil >= policy.halfChargeCancellationHours) return { fee: pricePerSession * 0.5, label: '50% cancellation fee' };
  return { fee: pricePerSession, label: 'Full charge (no-show / late cancel)' };
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── Main Component ────────────────────────────────────────────────────────────

const BookingSystem: React.FC<{ learner?: Learner }> = ({ learner = MOCK_LEARNER }) => {
  // ── Core state ────────────────────────────────────────────────────
  
  const bookingStore = useBookingStore();
  const calendarStore = useCalendarStore();
  const initData = bookingStore.learnerData[learner.id] || { 
    pricePerHour: 25, classDuration: 60, currency: '$', 
    accountBalance: 0, balanceLogs: [], paymentRecords: [], 
    activePackage: null, waitlist: [], dismissedReminders: [] 
  };
  const [pricePerHour, setPricePerHour] = useState(initData.pricePerHour);
  const [classDuration, setClassDuration] = useState(initData.classDuration);
  const [currency, setCurrency] = useState(initData.currency);
  const [accountBalance, setAccountBalance] = useState(initData.accountBalance);
  const [balanceLogs, setBalanceLogs] = useState<FundLog[]>(initData.balanceLogs);
  const [packages, setPackages] = useState<Package[]>(PACKAGE_DEFS);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(initData.paymentRecords);
  const [activePackage, setActivePackage] = useState<{
    id: string; sessions: number; price: number; remaining: number; purchasedAt: string; scheduledSessions: Session[];
  } | null>(initData.activePackage);

  // ── Feature state ─────────────────────────────────────────────────
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>({ freeCancellationHours: 24, halfChargeCancellationHours: 12 });
  const [bufferSettings, setBufferSettings] = useState<BufferSettings>({ enabled: false, minutes: 15 });
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(initData.waitlist);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // ── UI state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'packages' | 'finance' | 'automation' | 'analytics' | 'settings'>('overview');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionModal, setSessionModal] = useState<{ date: string; time: string } | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>(initData.dismissedReminders);
  const [draggedSession, setDraggedSession] = useState<Session | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ── Modals ────────────────────────────────────────────────────────
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState(0);
  const [fundReason, setFundReason] = useState('');
  const [fundType, setFundType] = useState<'add' | 'subtract'>('add');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ amount: 50, description: 'Tuition Fee' });
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingSession, setCancellingSession] = useState<Session | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isBlockTimeModalOpen, setIsBlockTimeModalOpen] = useState(false);
  const [newBlockedTime, setNewBlockedTime] = useState<Partial<BlockedTime>>({ allDay: true, label: 'Holiday' });
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [waitlistDate, setWaitlistDate] = useState('');
  const [waitlistTime, setWaitlistTime] = useState('10:00');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<Session | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // ── Automation ────────────────────────────────────────────────────
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([
    { dayOfWeek: 1, time: '10:00', active: false },
    { dayOfWeek: 3, time: '10:00', active: false },
    { dayOfWeek: 5, time: '10:00', active: false },
  ]);
  const [autoBookWeeks, setAutoBookWeeks] = useState(4);

  // ── Computed ──────────────────────────────────────────────────────
  
  useEffect(() => {
    bookingStore.updateLearnerData(learner.id, {
      pricePerHour, classDuration, currency, accountBalance, balanceLogs,
      paymentRecords, activePackage, waitlist, dismissedReminders
    });
  }, [learner.id, pricePerHour, classDuration, currency, accountBalance, balanceLogs, paymentRecords, activePackage, waitlist, dismissedReminders]);

  const pricePerSession = useMemo(() => (pricePerHour / 60) * classDuration, [pricePerHour, classDuration]);
  const completedCount = activePackage?.scheduledSessions.filter(s => s.status === 'completed').length ?? 0;
  const cancelledCount = activePackage?.scheduledSessions.filter(s => s.status === 'cancelled' || s.status === 'no-show').length ?? 0;
  const attendedUnpaidCount = activePackage?.scheduledSessions.filter(s => s.status === 'attended-unpaid').length ?? 0;
  const attendanceRate = activePackage?.sessions
    ? Math.round((completedCount / Math.max(activePackage.sessions - activePackage.remaining, 1)) * 100) : 0;

  const streak = useMemo(() => {
    if (!activePackage) return 0;
    const done = activePackage.scheduledSessions.filter(s => s.status === 'completed').map(s => s.date).sort().reverse();
    let count = 0; let prev: string | null = null;
    for (const d of done) {
      if (!prev) { count = 1; prev = d; continue; }
      if (differenceInDays(parseISO(prev), parseISO(d)) <= 8) { count++; prev = d; } else break;
    }
    return count;
  }, [activePackage]);

  const totalRevenue = useMemo(() => completedCount * pricePerSession, [completedCount, pricePerSession]);
  const pendingDebt = useMemo(() => paymentRecords.filter(p => p.status === 'deferred' || p.status === 'pending').reduce((s, p) => s + p.amount, 0), [paymentRecords]);

  // Monthly revenue for analytics
  const revenueData = useMemo<RevenueDataPoint[]>(() => {
    const months: Record<string, RevenueDataPoint> = {};
    for (const s of activePackage?.scheduledSessions ?? []) {
      if (s.status === 'completed') {
        const label = format(parseISO(s.date), 'MMM yy');
        if (!months[label]) months[label] = { label, revenue: 0, hours: 0, sessions: 0 };
        months[label].revenue += pricePerSession;
        months[label].hours += (s.duration ?? classDuration) / 60;
        months[label].sessions += 1;
      }
    }
    return Object.values(months).slice(-6);
  }, [activePackage, pricePerSession, classDuration]);

  // Conflict detection
  const isConflict = useCallback((date: string, time: string, durationMin: number, excludeId?: string): boolean => {
    const newStart = parseISO(`${date}T${time}`);
    const newEnd = new Date(newStart.getTime() + durationMin * 60000);
    const bufferMs = bufferSettings.enabled ? bufferSettings.minutes * 60000 : 0;

    // Check blocked times
    if (blockedTimes.some(b => b.date === date && b.allDay)) return true;
    if (blockedTimes.some(b => {
      if (b.date !== date || b.allDay || !b.startTime || !b.endTime) return false;
      const bStart = parseISO(`${b.date}T${b.startTime}`);
      const bEnd = parseISO(`${b.date}T${b.endTime}`);
      return newStart < bEnd && newEnd > bStart;
    })) return true;

    // Check existing sessions across ALL learners
    const allLearnerData = bookingStore.learnerData;
    for (const data of Object.values(allLearnerData)) {
      if (!data.activePackage) continue;
      for (const s of data.activePackage.scheduledSessions) {
        if (s.id === excludeId || s.status === 'cancelled') continue;
        if (s.date === date) {
          const sStart = parseISO(`${s.date}T${s.time}`);
          const sEnd = new Date(sStart.getTime() + (s.duration ?? data.classDuration) * 60000 + bufferMs);
          if (newStart < sEnd && newEnd > new Date(sStart.getTime() - bufferMs)) return true;
        }
      }
    }

    // Check Calendar Store events
    for (const ce of calendarStore.calendarEvents) {
      if (ce.id === excludeId) continue;
      if (ce.date === date && ce.time) {
        const ceStart = parseISO(`${ce.date}T${ce.time}Z`); // Note: useCalendarStore converts time to UTC, so we parse as UTC
        const durationMin = (ce as any).duration || 60;
        const ceEnd = new Date(ceStart.getTime() + durationMin * 60000);
        if (newStart < ceEnd && newEnd > ceStart) return true;
      }
    }

    // Check Google events
    for (const ge of googleEvents) {
      if (ge.id === excludeId) continue;
      const geStart = parseISO(ge.start);
      const geEnd = parseISO(ge.end);
      if (newStart < geEnd && newEnd > geStart) return true;
    }
    return false;
  }, [blockedTimes, activePackage, bufferSettings, classDuration, googleEvents]);

  // Smart reminders
  const reminders = useMemo<SmartReminder[]>(() => {
    const list: SmartReminder[] = [];
    if (accountBalance > 0 && accountBalance < pricePerSession * 2) {
      list.push({ id: 'low-balance', type: 'low-balance', severity: 'warning', dismissed: false, message: `Balance is low (${currency}${accountBalance.toFixed(2)}). Consider topping up.` });
    }
    if (activePackage && activePackage.remaining === 1) {
      list.push({ id: 'pkg-expiring', type: 'package-expiring', severity: 'warning', dismissed: false, message: 'Only 1 session remaining — time to renew!' });
    }
    if (streak >= 3) {
      list.push({ id: 'streak', type: 'streak', severity: 'success', dismissed: false, message: `${streak}-session streak! ${learner.name} is on a roll 🔥` });
    }
    if (attendedUnpaidCount > 0) {
      list.push({ id: 'unpaid-sessions', type: 'invoice-overdue', severity: 'error', dismissed: false, message: `${attendedUnpaidCount} attended session(s) with pending payment.` });
    }
    const tmrDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    if (activePackage?.scheduledSessions.some(s => s.date === tmrDate && s.status === 'scheduled')) {
      list.push({ id: 'session-tomorrow', type: 'session-tomorrow', severity: 'info', dismissed: false, message: `Reminder: Session with ${learner.name} is tomorrow.` });
    }
    return list.filter(r => !dismissedReminders.includes(r.id));
  }, [accountBalance, pricePerSession, activePackage, streak, dismissedReminders, currency, learner.name, attendedUnpaidCount]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handlePurchasePackage = (pkg: Package) => {
    const total = pricePerSession * pkg.sessions * (1 - pkg.discountPercent / 100);
    if (accountBalance >= total) {
      setAccountBalance(b => b - total);
      setBalanceLogs(prev => [{ id: generateId(), amount: total, reason: `Purchased ${pkg.label} package`, date: new Date().toISOString(), type: 'subtract' }, ...prev]);
      setActivePackage(prev => ({
        id: generateId(), sessions: (prev?.sessions ?? 0) + pkg.sessions,
        price: total, remaining: (prev?.remaining ?? 0) + pkg.sessions,
        purchasedAt: new Date().toISOString(), scheduledSessions: prev?.scheduledSessions ?? [],
      }));
      setPurchaseMessage({ type: 'success', text: `✓ ${pkg.label} package purchased for ${currency}${total.toFixed(2)}` });
    } else {
      setPurchaseMessage({ type: 'error', text: `Insufficient balance. Add ${currency}${(total - accountBalance).toFixed(2)} to proceed.` });
    }
    setTimeout(() => setPurchaseMessage(null), 4000);
  };

  const handleFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fundAmount.toString());
    if (isNaN(amt) || amt <= 0) return;
    if (fundType === 'subtract' && amt > accountBalance) { alert('Cannot subtract more than current balance.'); return; }
    setAccountBalance(b => fundType === 'add' ? b + amt : b - amt);
    setBalanceLogs(prev => [{ id: generateId(), amount: amt, reason: fundReason || (fundType === 'add' ? 'Added Funds' : 'Subtracted Funds'), date: new Date().toISOString(), type: fundType }, ...prev]);
    setFundAmount(0); setFundReason(''); setIsBalanceModalOpen(false);
  };

  const handleAddInvoice = () => {
    const rec: PaymentRecord = {
      id: generateId(), learnerId: learner.id, amount: newInvoice.amount, currency,
      status: 'pending', dueDate: new Date().toISOString(), description: newInvoice.description,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    };
    setPaymentRecords(prev => [rec, ...prev]);
    setIsInvoiceModalOpen(false);
  };

  const bookSession = useCallback((date: string, time: string, notes = '') => {
    if (!activePackage || activePackage.remaining <= 0) return;
    if (isConflict(date, time, classDuration)) {
      alert('⚠ Conflict detected! This slot overlaps with an existing session, blocked time, or Google Calendar event.');
      return;
    }
    const newSession: Session = { id: generateId(), date, time, status: 'scheduled', notes, duration: classDuration };
    calendarStore.addCalendarEvent({ id: newSession.id, title: 'Session: ' + learner.name, date, time, type: 'session', duration: classDuration, learnerId: learner.id } as any);
    setActivePackage(prev => {
      if (!prev) return prev;
      return { ...prev, remaining: prev.remaining - 1, scheduledSessions: [...prev.scheduledSessions, newSession].sort((a, b) => a.date.localeCompare(b.date)) };
    });

    // Reminders & notifications sync
    useAutomationStore.getState().addNotification({
      type: 'session',
      title: 'Class Booked!',
      message: `A new session with ${learner.name} is scheduled on ${date} at ${time}.`,
      learnerId: learner.id,
    });
  }, [activePackage, classDuration, isConflict, learner.id, learner.name]);

  const updateSession = (sessionId: string, updates: Partial<Session>) => {
    setActivePackage(prev => {
      if (!prev) return prev;
      return { ...prev, scheduledSessions: prev.scheduledSessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) };
    });
  };

  const removeSession = (sessionId: string) => {
    const session = activePackage?.scheduledSessions.find(s => s.id === sessionId);
    calendarStore.removeCalendarEvent(sessionId);
    if (session) {
      useAutomationStore.getState().addNotification({
        type: 'session',
        title: 'Class Removed',
        message: `Class with ${learner.name} on ${session.date} at ${session.time} was removed.`,
        learnerId: learner.id,
      });
    }
    setActivePackage(prev => {
      if (!prev) return prev;
      return { ...prev, remaining: prev.remaining + 1, scheduledSessions: prev.scheduledSessions.filter(s => s.id !== sessionId) };
    });
  };

  // Cancel with policy
  const initiateCancellation = (session: Session) => {
    setCancellingSession(session);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  const confirmCancellation = () => {
    if (!cancellingSession) return;
    const { fee } = getCancellationFee(cancellingSession, cancellationPolicy, pricePerSession);
    const isNoShow = fee === pricePerSession;
    updateSession(cancellingSession.id, {
      status: isNoShow ? 'no-show' : 'cancelled',
      cancellationFee: fee,
      cancellationReason,
    });
    if (fee > 0) {
      const rec: PaymentRecord = {
        id: generateId(), learnerId: learner.id, amount: fee, currency, status: 'pending',
        dueDate: new Date().toISOString(), description: `Cancellation fee – ${format(parseISO(cancellingSession.date), 'MMM d')}`,
        invoiceNumber: `CXFEE-${Date.now().toString().slice(-5)}`, sessionId: cancellingSession.id,
      };
      setPaymentRecords(prev => [rec, ...prev]);
    }
    // Restore remaining if free cancel
    if (fee === 0) {
      setActivePackage(prev => prev ? { ...prev, remaining: prev.remaining + 1 } : prev);
    }

    // Sync with Tutor Master Calendar
    calendarStore.removeCalendarEvent(cancellingSession.id);

    // Automation notification / reminder trigger
    useAutomationStore.getState().addNotification({
      type: 'session',
      title: 'Class Cancelled',
      message: `Class with ${learner.name} on ${cancellingSession.date} at ${cancellingSession.time} was cancelled. Reason: ${cancellationReason || 'Not specified'}.`,
      learnerId: learner.id,
    });

    setIsCancelModalOpen(false); setCancellingSession(null);
  };

  // Attended, pay later
  const markAttendedUnpaid = (session: Session) => {
    const invoiceId = generateId();
    const rec: PaymentRecord = {
      id: invoiceId, learnerId: learner.id, amount: pricePerSession, currency, status: 'deferred',
      dueDate: addDays(new Date(), 7).toISOString(),
      description: `Session on ${format(parseISO(session.date), 'MMM d')} – deferred payment`,
      invoiceNumber: `DEF-${Date.now().toString().slice(-5)}`, sessionId: session.id,
    };
    setPaymentRecords(prev => [rec, ...prev]);
    updateSession(session.id, { status: 'attended-unpaid', deferredInvoiceId: invoiceId });
    setPurchaseMessage({ type: 'success', text: '✓ Marked as attended. Invoice generated for deferred payment.' });
    setTimeout(() => setPurchaseMessage(null), 4000);
  };

  const sendPaymentRequest = (record: PaymentRecord) => {
    alert(`📧 Payment request sent to ${learner.email ?? learner.name} for ${currency}${record.amount.toFixed(2)} (${record.description})`);
  };

  const markPaymentPaid = (id: string) => {
    setPaymentRecords(prev => prev.map(p => p.id === id ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p));
    // If deferred, also update session status
    const record = paymentRecords.find(p => p.id === id);
    if (record?.sessionId) updateSession(record.sessionId, { status: 'completed' });
  };

  // Reschedule
  const initiateReschedule = (session: Session) => {
    setRescheduleSession(session);
    setRescheduleDate(session.date);
    setRescheduleTime(session.time);
    setIsRescheduleModalOpen(true);
  };

  const confirmReschedule = () => {
    if (!rescheduleSession || !rescheduleDate || !rescheduleTime) return;
    if (isConflict(rescheduleDate, rescheduleTime, classDuration, rescheduleSession.id)) {
      alert('⚠ Conflict detected on the new date/time!'); return;
    }
    const oldDate = rescheduleSession.date;
    const oldTime = rescheduleSession.time;
    updateSession(rescheduleSession.id, { date: rescheduleDate, time: rescheduleTime, status: 'rescheduled' });
    
    // Sync with Tutor Master Calendar
    const existingEvt = calendarStore.calendarEvents.find(e => e.id === rescheduleSession.id || (e.date === rescheduleSession.date && e.time === rescheduleSession.time && e.learnerId === learner.id));
    if (existingEvt) {
      calendarStore.updateCalendarEvent({
        ...existingEvt,
        date: rescheduleDate,
        time: rescheduleTime,
        title: 'Session: ' + learner.name,
      });
    } else {
      calendarStore.addCalendarEvent({
        id: rescheduleSession.id,
        title: 'Session: ' + learner.name,
        date: rescheduleDate,
        time: rescheduleTime,
        type: 'session',
        duration: classDuration,
        learnerId: learner.id
      } as any);
    }

    // Automation notification / reminder trigger
    useAutomationStore.getState().addNotification({
      type: 'session',
      title: 'Class Rescheduled',
      message: `Class with ${learner.name} on ${oldDate} at ${oldTime} was rescheduled to ${rescheduleDate} at ${rescheduleTime}.`,
      learnerId: learner.id,
    });

    setIsRescheduleModalOpen(false); setRescheduleSession(null);
  };

  // Drag & drop
  const handleDragStart = (session: Session) => setDraggedSession(session);
  const handleDragOver = (e: React.DragEvent, dateStr: string) => { e.preventDefault(); setDragOverDate(dateStr); };
  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (!draggedSession) { setDragOverDate(null); return; }
    if (isConflict(dateStr, draggedSession.time, classDuration, draggedSession.id)) {
      alert('⚠ Conflict on this date!'); setDragOverDate(null); setDraggedSession(null); return;
    }
    const oldDate = draggedSession.date;
    updateSession(draggedSession.id, { date: dateStr, status: 'rescheduled' });
    
    // Sync with Tutor Master Calendar
    const existingEvt = calendarStore.calendarEvents.find(e => e.id === draggedSession.id || (e.date === draggedSession.date && e.time === draggedSession.time && e.learnerId === learner.id));
    if (existingEvt) {
      calendarStore.updateCalendarEvent({
        ...existingEvt,
        date: dateStr,
        title: 'Session: ' + learner.name,
      });
    } else {
      calendarStore.addCalendarEvent({
        id: draggedSession.id,
        title: 'Session: ' + learner.name,
        date: dateStr,
        time: draggedSession.time,
        type: 'session',
        duration: classDuration,
        learnerId: learner.id
      } as any);
    }

    // Automation notification / reminder trigger
    useAutomationStore.getState().addNotification({
      type: 'session',
      title: 'Class Rescheduled via Calendar Drag & Drop',
      message: `Class with ${learner.name} moved from ${oldDate} to ${dateStr} at ${draggedSession.time}.`,
      learnerId: learner.id,
    });

    setDraggedSession(null); setDragOverDate(null);
  };

  // Waitlist
  const addToWaitlist = () => {
    const entry: WaitlistEntry = { id: generateId(), date: waitlistDate, time: waitlistTime, requestedAt: new Date().toISOString(), notified: false };
    setWaitlist(prev => [...prev, entry]);
    setIsWaitlistModalOpen(false);
    setPurchaseMessage({ type: 'success', text: '✓ Added to waitlist.' });
    setTimeout(() => setPurchaseMessage(null), 3000);
  };

  // Google Calendar mock connect
  const handleGoogleConnect = () => {
    setGoogleConnected(true);
    // Mock some personal events
    setGoogleEvents([
      { id: 'g1', title: 'Doctor Appointment', start: format(addDays(new Date(), 3), 'yyyy-MM-dd') + 'T10:00:00', end: format(addDays(new Date(), 3), 'yyyy-MM-dd') + 'T11:00:00', type: 'personal' },
      { id: 'g2', title: 'Team Meeting', start: format(addDays(new Date(), 5), 'yyyy-MM-dd') + 'T14:00:00', end: format(addDays(new Date(), 5), 'yyyy-MM-dd') + 'T15:00:00', type: 'personal' },
    ]);
    alert('✓ Google Calendar connected! Personal events imported and will be checked for conflicts.');
  };

  // Auto-book
  const handleAutoBook = () => {
    if (!activePackage || activePackage.remaining <= 0) { alert('No remaining sessions.'); return; }
    const activeRules = recurringRules.filter(r => r.active);
    if (!activeRules.length) { alert('Enable at least one recurring day first.'); return; }
    const sessionsToBook: { date: string; time: string }[] = [];
    const today = new Date();
    for (let w = 0; w < autoBookWeeks; w++) {
      for (const rule of activeRules) {
        const base = startOfWeek(addWeeks(today, w));
        const d = addDays(base, rule.dayOfWeek);
        if (isFuture(d)) sessionsToBook.push({ date: format(d, 'yyyy-MM-dd'), time: rule.time });
      }
    }
    const toBook = sessionsToBook.slice(0, activePackage.remaining);
    let booked = 0;
    const newSessions: Session[] = [];
    for (const s of toBook) {
      if (!isConflict(s.date, s.time, classDuration)) {
        const sesId = `auto-${s.date}-${s.time}`;
        newSessions.push({ id: sesId, date: s.date, time: s.time, status: 'scheduled', duration: classDuration, notes: 'Auto-booked' });
        booked++;

        // Add to Tutor Master Calendar immediately
        calendarStore.addCalendarEvent({
          id: sesId,
          title: 'Session: ' + learner.name,
          date: s.date,
          time: s.time,
          type: 'session',
          duration: classDuration,
          learnerId: learner.id
        } as any);

        // Raise notification / reminder trigger
        useAutomationStore.getState().addNotification({
          type: 'session',
          title: 'Class Auto-Booked!',
          message: `Recurring class with ${learner.name} of ${classDuration} min is auto-booked on ${s.date} at ${s.time}.`,
          learnerId: learner.id,
        });
      }
    }
    setActivePackage(prev => {
      if (!prev) return prev;
      const existing = new Set(prev.scheduledSessions.map(s => s.date + s.time));
      const unique = newSessions.filter(s => !existing.has(s.date + s.time));
      return { ...prev, remaining: Math.max(0, prev.remaining - unique.length), scheduledSessions: [...prev.scheduledSessions, ...unique].sort((a, b) => a.date.localeCompare(b.date)) };
    });
    setPurchaseMessage({ type: 'success', text: `✓ ${booked} sessions auto-booked (${toBook.length - booked} skipped due to conflicts).` });
    setTimeout(() => setPurchaseMessage(null), 4000);
  };

  // Block time
  const addBlockedTime = () => {
    if (!newBlockedTime.date || !newBlockedTime.label) return;
    const entry: BlockedTime = { id: generateId(), date: newBlockedTime.date!, label: newBlockedTime.label!, allDay: newBlockedTime.allDay ?? true, startTime: newBlockedTime.startTime, endTime: newBlockedTime.endTime };
    setBlockedTimes(prev => [...prev, entry]);
    setIsBlockTimeModalOpen(false);
    setNewBlockedTime({ allDay: true, label: 'Holiday' });
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [['Date', 'Time', 'Duration', 'Status', 'Notes', 'Revenue']];
    for (const s of activePackage?.scheduledSessions ?? []) {
      rows.push([s.date, s.time, `${s.duration ?? classDuration}min`, STATUS_CONFIG[s.status].label, s.notes ?? '', s.status === 'completed' ? `${currency}${pricePerSession.toFixed(2)}` : '0']);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sessions-${learner.name.replace(/\s/g, '-')}.csv`; a.click();
  };

  // iCal export
  const exportICal = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TutorApp//EN'];
    for (const s of activePackage?.scheduledSessions ?? []) {
      const dtStart = s.date.replace(/-/g, '') + 'T' + s.time.replace(':', '') + '00';
      lines.push('BEGIN:VEVENT', `DTSTART:${dtStart}`, `SUMMARY:Session with ${learner.name}`, `DURATION:PT${s.duration ?? classDuration}M`, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'sessions.ics'; a.click();
  };

  // Generate Zoom link (mock)
  const generateZoomLink = () => `https://zoom.us/j/${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

  // WhatsApp reminder template
  const generateWhatsAppTemplate = (session: Session) => {
    const msg = `Hi ${learner.name}! 👋 Just a reminder about your session tomorrow (${format(parseISO(session.date), 'MMM d')} at ${session.time}). Looking forward to it! Let me know if anything changes.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  // ── Calendar ──────────────────────────────────────────────────────
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const sessionsByDate = useMemo(() => {
    const map: Record<string, Session[]> = {};
    for (const s of activePackage?.scheduledSessions ?? []) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [activePackage]);

  const globalSessionsByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    const allLearnerData = bookingStore.learnerData;
    for (const [lId, data] of Object.entries(allLearnerData)) {
      if (lId === learner.id || !data.activePackage) continue; 
      for (const s of data.activePackage.scheduledSessions) {
        if (s.status === 'scheduled' || s.status === 'rescheduled') {
            map[s.date] = true;
        }
      }
    }
    return map;
  }, [bookingStore.learnerData, learner.id]);

  const blockedByDate = useMemo(() => {
    const set = new Set<string>();
    blockedTimes.filter(b => b.allDay).forEach(b => set.add(b.date));
    return set;
  }, [blockedTimes]);

  const googleByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const ge of googleEvents) {
      const d = ge.start.slice(0, 10);
      map[d] = true;
    }
    for (const ce of calendarStore.calendarEvents) {
      if (ce.date) map[ce.date] = true;
    }
    return map;
  }, [googleEvents, calendarStore.calendarEvents]);

  const handleDayClick = (dateStr: string) => {
    if (blockedByDate.has(dateStr)) { alert('This date is blocked.'); return; }
    if (!activePackage || activePackage.remaining <= 0) return;
    setSessionModal({ date: dateStr, time: '10:00' });
  };

  const renderMonthCalendar = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(y, m);
    const firstDay = getFirstDay(y, m);
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const isToday = dateStr === todayStr;
      const sessions = sessionsByDate[dateStr] ?? [];
      const isBlocked = blockedByDate.has(dateStr);
      const hasGlobalEvent = googleByDate[dateStr] || globalSessionsByDate[dateStr];
      const isDragOver = dragOverDate === dateStr;

      cells.push(
        <div
          key={d}
          onClick={() => handleDayClick(dateStr)}
          onDragOver={e => handleDragOver(e, dateStr)}
          onDrop={e => handleDrop(e, dateStr)}
          onDragLeave={() => setDragOverDate(null)}
          style={{
            padding: '6px', border: `1px solid ${isDragOver ? '#2563eb' : isBlocked ? '#fca5a5' : '#e5e7eb'}`,
            minHeight: 60, cursor: isBlocked ? 'not-allowed' : activePackage && activePackage.remaining > 0 ? 'pointer' : 'default',
            background: isDragOver ? '#dbeafe' : isBlocked ? '#fef2f2' : isToday ? '#eff6ff' : '#fff',
            borderRadius: 6, position: 'relative', transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#2563eb' : isBlocked ? '#ef4444' : '#374151' }}>{d}</span>
          {isBlocked && <div style={{ fontSize: 9, color: '#ef4444' }}>Blocked</div>}
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {sessions.some(s => s.status === 'scheduled') && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9' }} />}
            {sessions.some(s => s.status === 'completed') && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />}
            {sessions.some(s => s.status === 'cancelled' || s.status === 'no-show') && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />}
            {sessions.some(s => s.status === 'attended-unpaid') && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }} />}
            {hasGlobalEvent && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#9ca3af', border: '1px solid #6b7280' }} title="Global event or other learner" />}
          </div>
          {sessions.length > 1 && (
            <span style={{ fontSize: 9, background: '#e0f2fe', color: '#0369a1', borderRadius: 4, padding: '1px 4px', position: 'absolute', bottom: 3, right: 3 }}>{sessions.length}</span>
          )}
        </div>
      );
    }
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => setCurrentDate(new Date(y, m - 1, 1))} style={btnStyle}>‹</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{currentDate.toLocaleString('default', { month: 'long' })} {y}</span>
          <button onClick={() => setCurrentDate(new Date(y, m + 1, 1))} style={btnStyle}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>{cells}</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#6b7280' }}>
          {[['#0ea5e9', 'Scheduled'], ['#10b981', 'Completed'], ['#ef4444', 'Cancelled'], ['#f97316', 'Unpaid'], ['#9ca3af', 'Google']].map(([c, l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ── Style helpers ─────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 24, marginBottom: 0 };
  const btnStyle: React.CSSProperties = { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', cursor: 'pointer', fontSize: 14, fontWeight: 500 };
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
    background: active ? '#1e40af' : 'transparent', color: active ? '#fff' : '#6b7280', transition: 'all 0.15s',
  });
  const severityColors = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: 'ℹ' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '⚠' },
    error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '!' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '✓' },
  };

  // ── Render tabs ───────────────────────────────────────────────────

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {reminders.map(r => {
        const c = severityColors[r.severity];
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10 }}>
            <span style={{ fontSize: 14, color: c.text, fontWeight: 700 }}>{c.icon}</span>
            <span style={{ fontSize: 13, color: c.text, flex: 1 }}>{r.message}</span>
            <button onClick={() => setDismissedReminders(p => [...p, r.id])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.text, fontSize: 16 }}>×</button>
          </div>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Account Balance', value: `${currency}${accountBalance.toFixed(2)}`, color: accountBalance < 0 ? '#ef4444' : '#1e40af', sub: 'available funds' },
          { label: 'Sessions Left', value: activePackage?.remaining ?? 0, color: '#10b981', sub: 'in current package' },
          { label: 'Completed', value: completedCount, color: '#6366f1', sub: 'sessions done' },
          { label: 'Attendance', value: `${attendanceRate}%`, color: attendanceRate >= 80 ? '#10b981' : '#f59e0b', sub: 'completion rate' },
          { label: 'Streak', value: `${streak} 🔥`, color: streak >= 3 ? '#f59e0b' : '#6b7280', sub: 'consecutive' },
          { label: 'Pending Debt', value: `${currency}${pendingDebt.toFixed(2)}`, color: pendingDebt > 0 ? '#ef4444' : '#9ca3af', sub: 'deferred payments' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Upcoming Sessions</div>
        {(activePackage?.scheduledSessions.filter(s => s.status === 'scheduled' && isFuture(parseISO(s.date + 'T' + s.time))) ?? []).length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No upcoming sessions. Book from the Sessions tab.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activePackage?.scheduledSessions.filter(s => s.status === 'scheduled').slice(0, 5).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ background: '#0ea5e9', color: '#fff', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700, minWidth: 56, textAlign: 'center' }}>
                  {format(parseISO(s.date), 'MMM d')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0c4a6e' }}>{s.time} · {s.duration ?? classDuration}min</div>
                  {s.notes && <div style={{ fontSize: 11, color: '#0369a1' }}>{s.notes}</div>}
                </div>
                <button onClick={() => generateWhatsAppTemplate(s)} style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>📱 WA</button>
                <button onClick={() => initiateReschedule(s)} style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }}>Reschedule</button>
                <button onClick={() => { setEditingSession(s); setIsSessionDetailOpen(true); }} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11 }}>Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSessions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Calendar <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(drag sessions to reschedule)</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            {googleConnected && <span style={{ fontSize: 11, padding: '3px 8px', background: '#dcfce7', color: '#166534', borderRadius: 20, border: '1px solid #bbf7d0' }}>✓ Google Synced</span>}
            <button onClick={() => setIsBlockTimeModalOpen(true)} style={{ ...btnStyle, fontSize: 11 }}>🚫 Block Time</button>
            <button onClick={() => setIsWaitlistModalOpen(true)} style={{ ...btnStyle, fontSize: 11 }}>📋 Waitlist</button>
          </div>
        </div>
        {!activePackage && (
          <div style={{ padding: '12px 16px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 12, fontSize: 13, color: '#92400e' }}>
            Purchase a package first to enable session booking.
          </div>
        )}
        {renderMonthCalendar()}
      </div>

      {activePackage && activePackage.scheduledSessions.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>All Sessions ({activePackage.scheduledSessions.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activePackage.scheduledSessions.map(s => {
              const st = STATUS_CONFIG[s.status];
              const isUpcoming = isFuture(parseISO(s.date + 'T' + s.time));
              return (
                <div
                  key={s.id}
                  draggable={s.status === 'scheduled'}
                  onDragStart={() => handleDragStart(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: s.status === 'scheduled' ? 'grab' : 'default' }}
                >
                  {s.status === 'scheduled' && <span style={{ fontSize: 14, color: '#9ca3af' }} title="Drag to reschedule">⠿</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{format(parseISO(s.date), 'EEE, MMM d yyyy')} · {s.time} · {s.duration ?? classDuration}min</div>
                    {s.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.notes}</div>}
                    {s.cancellationFee != null && s.cancellationFee > 0 && <div style={{ fontSize: 11, color: '#ef4444' }}>Fee: {currency}{s.cancellationFee.toFixed(2)}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                  {isUpcoming && s.status === 'scheduled' && (
                    <>
                      <button onClick={() => initiateReschedule(s)} style={{ ...btnStyle, fontSize: 10, padding: '3px 8px' }}>Reschedule</button>
                      <button onClick={() => initiateCancellation(s)} style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>Cancel</button>
                    </>
                  )}
                  {s.status === 'scheduled' && !isUpcoming && (
                    <button onClick={() => markAttendedUnpaid(s)} style={{ ...btnStyle, fontSize: 10, padding: '3px 8px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>Attended, Pay Later</button>
                  )}
                  <button onClick={() => { setEditingSession(s); setIsSessionDetailOpen(true); }} style={{ ...btnStyle, padding: '4px 8px', fontSize: 10 }}>Edit</button>
                  <button onClick={() => removeSession(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16 }}>×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {waitlist.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Waitlist ({waitlist.length})</div>
          {waitlist.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 13 }}>{format(parseISO(w.date), 'EEE, MMM d')} at {w.time}</div>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Requested {format(parseISO(w.requestedAt), 'MMM d')}</span>
              {!w.notified && <button onClick={() => setWaitlist(prev => prev.map(x => x.id === w.id ? { ...x, notified: true } : x))} style={{ ...btnStyle, fontSize: 11 }}>Notify</button>}
              {w.notified && <span style={{ fontSize: 11, color: '#10b981' }}>✓ Notified</span>}
              <button onClick={() => setWaitlist(prev => prev.filter(x => x.id !== w.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {blockedTimes.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Blocked Times</div>
          {blockedTimes.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, flex: 1 }}>🚫 {b.label} — {format(parseISO(b.date), 'MMM d')} {!b.allDay && b.startTime ? `${b.startTime}–${b.endTime}` : '(all day)'}</span>
              <button onClick={() => setBlockedTimes(prev => prev.filter(x => x.id !== b.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPackages = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {purchaseMessage && (
        <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: purchaseMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${purchaseMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: purchaseMessage.type === 'success' ? '#166534' : '#991b1b' }}>{purchaseMessage.text}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {packages.map((pkg, idx) => {
          const total = pricePerSession * pkg.sessions * (1 - pkg.discountPercent / 100);
          const full = pricePerSession * pkg.sessions;
          const affordable = accountBalance >= total;
          return (
            <div key={pkg.id} style={{ background: '#fff', border: `2px solid ${pkg.id === 'ten' ? pkg.color : '#e5e7eb'}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              {pkg.badge && <div style={{ position: 'absolute', top: -10, right: 12, background: pkg.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>{pkg.badge}</div>}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{pkg.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{pkg.sessions} session{pkg.sessions > 1 ? 's' : ''} · {classDuration}min each</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: pkg.color }}>{currency}{total.toFixed(2)}</div>
                {pkg.discountPercent > 0 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>{currency}{full.toFixed(2)}</span>
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>-{pkg.discountPercent}%</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Discount %</label>
                <input type="number" min={0} max={50} value={pkg.discountPercent} onChange={e => { const p = [...packages]; p[idx].discountPercent = Number(e.target.value); setPackages(p); }}
                  style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 12 }} />
              </div>
              <button onClick={() => handlePurchasePackage(pkg)} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: affordable ? pkg.color : '#e5e7eb', color: affordable ? '#fff' : '#9ca3af' }}>
                {affordable ? 'Purchase' : `Need ${currency}${(total - accountBalance).toFixed(2)} more`}
              </button>
            </div>
          );
        })}
      </div>
      {activePackage && (
        <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#166534', marginBottom: 10 }}>Active Package</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['Total Sessions', activePackage.sessions], ['Remaining', activePackage.remaining], ['Purchased', format(parseISO(activePackage.purchasedAt), 'MMM d, yyyy')]].map(([l, v]) => (
              <div key={l as string}><div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{v}</div></div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
              <span>Progress</span><span>{activePackage.sessions - activePackage.remaining}/{activePackage.sessions} used</span>
            </div>
            <div style={{ height: 6, background: '#dcfce7', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((activePackage.sessions - activePackage.remaining) / activePackage.sessions) * 100}%`, background: '#10b981', borderRadius: 10, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFinance = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Account Balance</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: accountBalance < 0 ? '#ef4444' : '#1e40af' }}>{currency}{accountBalance.toFixed(2)}</div>
            {pendingDebt > 0 && <div style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}>Pending debt: {currency}{pendingDebt.toFixed(2)}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={btnStyle}>Print</button>
            <button onClick={exportCSV} style={btnStyle}>Export CSV</button>
            <button onClick={exportICal} style={btnStyle}>Export iCal</button>
            <button onClick={() => setIsBalanceModalOpen(true)} style={{ ...btnStyle, background: '#1e40af', color: '#fff', border: 'none' }}>Manage Funds</button>
            <button onClick={() => setIsInvoiceModalOpen(true)} style={{ ...btnStyle, background: '#10b981', color: '#fff', border: 'none' }}>+ Invoice</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Hourly Rate</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>{currency}</span>
              <input type="number" value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 8px 8px 24px', fontSize: 14 }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Duration</label>
            <select value={classDuration} onChange={e => setClassDuration(Number(e.target.value))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }}>
              {[30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v}min</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Currency</label>
            <input type="text" value={currency} maxLength={3} onChange={e => setCurrency(e.target.value)} style={{ width: 52, textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
          Price per {classDuration}-min session: <strong>{currency}{pricePerSession.toFixed(2)}</strong>
        </div>
      </div>

      {/* Cancellation policy */}
      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Cancellation Policy</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Define when free cancellation ends and when charges apply.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Free cancellation within (hours)</label>
            <input type="number" value={cancellationPolicy.freeCancellationHours} onChange={e => setCancellationPolicy(p => ({ ...p, freeCancellationHours: Number(e.target.value) }))}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>50% charge if within (hours)</label>
            <input type="number" value={cancellationPolicy.halfChargeCancellationHours} onChange={e => setCancellationPolicy(p => ({ ...p, halfChargeCancellationHours: Number(e.target.value) }))}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fefce8', borderRadius: 8, fontSize: 12, color: '#78350f' }}>
          Rules: Free cancel ≥{cancellationPolicy.freeCancellationHours}h · 50% fee {cancellationPolicy.halfChargeCancellationHours}–{cancellationPolicy.freeCancellationHours}h · Full charge &lt;{cancellationPolicy.halfChargeCancellationHours}h or no-show
        </div>
      </div>

      {paymentRecords.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Invoices & Payments</div>
          {paymentRecords.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.invoiceNumber} · {p.description}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Due {format(parseISO(p.dueDate), 'MMM d, yyyy')}{p.paidAt && ` · Paid ${format(parseISO(p.paidAt), 'MMM d')}`}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{currency}{p.amount.toFixed(2)}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: p.status === 'paid' ? '#dcfce7' : p.status === 'overdue' ? '#fee2e2' : p.status === 'deferred' ? '#ffedd5' : '#fef3c7', color: p.status === 'paid' ? '#166534' : p.status === 'overdue' ? '#991b1b' : p.status === 'deferred' ? '#c2410c' : '#92400e' }}>
                {p.status === 'deferred' ? 'Deferred' : p.status}
              </span>
              {p.status !== 'paid' && (
                <>
                  <button onClick={() => markPaymentPaid(p.id)} style={{ ...btnStyle, fontSize: 11, padding: '3px 8px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>Mark Paid</button>
                  {(p.status === 'deferred' || p.status === 'pending') && (
                    <button onClick={() => sendPaymentRequest(p)} style={{ ...btnStyle, fontSize: 11, padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Send Request</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Transaction Log</div>
        {balanceLogs.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No transactions yet.</div>
        ) : (
          balanceLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{log.reason}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(log.date).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: log.type === 'add' ? '#10b981' : '#ef4444' }}>
                {log.type === 'add' ? '+' : '-'}{currency}{log.amount.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    const maxRev = Math.max(...revenueData.map(d => d.revenue), 1);
    const timeSlots = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    const heatmapData: Record<string, Record<string, number>> = {};
    for (const day of DAYS) { heatmapData[day] = {}; for (const t of timeSlots) heatmapData[day][t] = 0; }
    for (const s of activePackage?.scheduledSessions ?? []) {
      if (s.status === 'completed') {
        const day = DAYS[parseISO(s.date).getDay()];
        const hour = s.time.slice(0, 2);
        if (heatmapData[day] && heatmapData[day][hour] !== undefined) heatmapData[day][hour]++;
      }
    }
    const maxHeat = Math.max(...Object.values(heatmapData).flatMap(d => Object.values(d)), 1);

    const cancelRate = activePackage ? Math.round((cancelledCount / Math.max(activePackage.sessions - activePackage.remaining, 1)) * 100) : 0;
    const totalHours = (activePackage?.scheduledSessions ?? []).filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.duration ?? classDuration) / 60, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Revenue', value: `${currency}${totalRevenue.toFixed(2)}`, color: '#10b981' },
            { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, color: '#6366f1' },
            { label: 'Cancel Rate', value: `${cancelRate}%`, color: cancelRate > 20 ? '#ef4444' : '#f59e0b' },
            { label: 'Avg/Session', value: completedCount > 0 ? `${currency}${(totalRevenue / completedCount).toFixed(2)}` : '-', color: '#0ea5e9' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Monthly Revenue</div>
          {revenueData.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Complete sessions to see revenue chart.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
              {revenueData.map(d => (
                <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{currency}{d.revenue.toFixed(0)}</div>
                  <div style={{ width: '100%', background: '#1e40af', borderRadius: '4px 4px 0 0', height: `${(d.revenue / maxRev) * 100}px`, minHeight: 4, transition: 'height 0.4s' }} />
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{d.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Productive Time Slots Heatmap</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Darker = more completed sessions</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 10, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 6px', color: '#9ca3af' }}></th>
                  {timeSlots.map(t => <th key={t} style={{ padding: '4px 4px', color: '#9ca3af', fontWeight: 500 }}>{t}h</th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td style={{ padding: '3px 6px', fontWeight: 600, color: '#374151', fontSize: 11 }}>{day}</td>
                    {timeSlots.map(t => {
                      const val = heatmapData[day][t];
                      const intensity = val / maxHeat;
                      return (
                        <td key={t} title={`${day} ${t}:00 — ${val} session(s)`} style={{ padding: 2 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 4, background: val === 0 ? '#f1f5f9' : `rgba(30,64,175,${0.15 + intensity * 0.85})`, cursor: 'default' }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ ...btnStyle, flex: 1, textAlign: 'center' }}>📥 Export CSV</button>
          <button onClick={exportICal} style={{ ...btnStyle, flex: 1, textAlign: 'center' }}>📅 Export iCal</button>
          <button onClick={() => window.print()} style={{ ...btnStyle, flex: 1, textAlign: 'center' }}>🖨 Print Report</button>
        </div>
      </div>
    );
  };

  const renderAutomation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Recurring Schedule</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Set weekly recurring days and auto-book sessions.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {recurringRules.map((rule, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: `1px solid ${rule.active ? '#bfdbfe' : '#e5e7eb'}`, borderRadius: 10, background: rule.active ? '#eff6ff' : '#f9fafb' }}>
              <input type="checkbox" checked={rule.active} onChange={e => { const r = [...recurringRules]; r[idx].active = e.target.checked; setRecurringRules(r); }} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <select value={rule.dayOfWeek} onChange={e => { const r = [...recurringRules]; r[idx].dayOfWeek = Number(e.target.value); setRecurringRules(r); }} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}>
                {FULL_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>at</span>
              <input type="time" value={rule.time} onChange={e => { const r = [...recurringRules]; r[idx].time = e.target.value; setRecurringRules(r); }} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 13 }} />
              {idx >= 3 && <button onClick={() => setRecurringRules(r => r.filter((_, i) => i !== idx))} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18 }}>×</button>}
            </div>
          ))}
        </div>
        <button onClick={() => setRecurringRules(r => [...r, { dayOfWeek: 1, time: '10:00', active: true }])} style={{ ...btnStyle, marginBottom: 16, fontSize: 12 }}>+ Add Day</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Auto-book for next</label>
          <input type="number" min={1} max={12} value={autoBookWeeks} onChange={e => setAutoBookWeeks(Number(e.target.value))} style={{ width: 56, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', fontSize: 13, textAlign: 'center' }} />
          <span style={{ fontSize: 13, color: '#374151' }}>weeks</span>
          <button onClick={handleAutoBook} style={{ marginLeft: 'auto', padding: '8px 16px', border: 'none', borderRadius: 8, background: '#1e40af', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Auto-Book Now</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Buffer Time Between Sessions</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Auto-block a buffer after each session for breaks.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={bufferSettings.enabled} onChange={e => setBufferSettings(p => ({ ...p, enabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13 }}>Enable buffer</span>
          </label>
          <select value={bufferSettings.minutes} disabled={!bufferSettings.enabled} onChange={e => setBufferSettings(p => ({ ...p, minutes: Number(e.target.value) }))} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 13, opacity: bufferSettings.enabled ? 1 : 0.4 }}>
            {[5, 10, 15, 20, 30].map(v => <option key={v} value={v}>{v} min break</option>)}
          </select>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Google Calendar Integration</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Sync events and detect conflicts before booking.</div>
        {!googleConnected ? (
          <button onClick={handleGoogleConnect} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: '#4285f4', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔗</span> Connect Google Calendar (OAuth)
          </button>
        ) : (
          <div>
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 12 }}>
              ✓ Connected — {googleEvents.length} personal event(s) imported
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {googleEvents.map(ge => (
                <div key={ge.id} style={{ fontSize: 12, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, display: 'flex', gap: 10 }}>
                  <span style={{ color: '#9ca3af' }}>📅</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{ge.title}</span>
                  <span style={{ color: '#9ca3af' }}>{format(parseISO(ge.start), 'MMM d, h:mm a')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Messaging Templates</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Quick-send reminders via WhatsApp or copy to clipboard.</div>
        {(activePackage?.scheduledSessions.filter(s => s.status === 'scheduled') ?? []).slice(0, 3).map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 13 }}>{format(parseISO(s.date), 'EEE, MMM d')} at {s.time}</div>
            <button onClick={() => generateWhatsAppTemplate(s)} style={{ ...btnStyle, fontSize: 11, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>📱 WhatsApp</button>
            <button onClick={() => { const msg = `Hi ${learner.name}! Your session is on ${format(parseISO(s.date), 'MMM d')} at ${s.time}. See you then!`; navigator.clipboard.writeText(msg); alert('Copied!'); }} style={{ ...btnStyle, fontSize: 11 }}>Copy</button>
          </div>
        ))}
        {(activePackage?.scheduledSessions.filter(s => s.status === 'scheduled') ?? []).length === 0 && (
          <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>No upcoming sessions to send reminders for.</div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Learner Self-Booking Link</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Share this link with {learner.name} to let them book sessions directly.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={`https://tutor.app/book/${learner.id}?teacher=me`} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#f8fafc', color: '#374151' }} />
          <button onClick={() => { navigator.clipboard.writeText(`https://tutor.app/book/${learner.id}?teacher=me`); alert('Copied!'); }} style={{ ...btnStyle, background: '#1e40af', color: '#fff', border: 'none' }}>Copy</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Timezone</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Learner's local timezone for display purposes.</div>
        <select defaultValue={learner.timezone ?? 'UTC'} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }}>
          {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo', 'Asia/Seoul', 'Europe/Paris', 'Australia/Sydney'].map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Zoom / Google Meet Integration</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Auto-generate a meeting link for each session.</div>
        {activePackage?.scheduledSessions.filter(s => s.status === 'scheduled').slice(0, 3).map(s => {
          const link = generateZoomLink();
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 13 }}>{format(parseISO(s.date), 'EEE, MMM d')} at {s.time}</div>
              <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '4px 10px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>🎥 Join Zoom</a>
            </div>
          );
        })}
        {!activePackage && <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>Purchase a package to see sessions here.</div>}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Notion / Google Sheets Export</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>Export session data to external tools.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ ...btnStyle, flex: 1, textAlign: 'center' }}>📊 Export to Sheets (CSV)</button>
          <button onClick={() => alert('Notion integration coming soon!')} style={{ ...btnStyle, flex: 1, textAlign: 'center' }}>📝 Export to Notion</button>
        </div>
      </div>
    </div>
  );

  // ── Modals ────────────────────────────────────────────────────────

  const renderBalanceModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Manage Funds</div>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 18 }}>
          {(['add', 'subtract'] as const).map(t => (
            <button key={t} onClick={() => setFundType(t)} style={{ flex: 1, padding: 8, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: fundType === t ? '#fff' : 'transparent', color: fundType === t ? (t === 'add' ? '#1e40af' : '#ef4444') : '#9ca3af', boxShadow: fundType === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {t === 'add' ? 'Add Funds' : 'Subtract / Refund'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>{currency}</span>
            <input type="number" step="0.01" value={fundAmount} onChange={e => setFundAmount(Number(e.target.value))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 10px 10px 30px', fontSize: 15, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason</label>
          <input type="text" placeholder="e.g. Bank Transfer, Cash Payment" value={fundReason} onChange={e => setFundReason(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setIsBalanceModalOpen(false)} style={btnStyle}>Cancel</button>
          <button onClick={handleFundSubmit as any} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, background: fundType === 'add' ? '#1e40af' : '#ef4444', color: '#fff' }}>
            {fundType === 'add' ? 'Add Funds' : 'Deduct Funds'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInvoiceModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Create Invoice</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Description</label>
          <input type="text" value={newInvoice.description} onChange={e => setNewInvoice(p => ({ ...p, description: e.target.value }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Amount</label>
          <input type="number" value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: Number(e.target.value) }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setIsInvoiceModalOpen(false)} style={btnStyle}>Cancel</button>
          <button onClick={handleAddInvoice} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, background: '#10b981', color: '#fff' }}>Create</button>
        </div>
      </div>
    </div>
  );

  const renderSessionDetailModal = () => {
    if (!editingSession) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Edit Session</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>{format(parseISO(editingSession.date), 'EEEE, MMMM d yyyy')} · {editingSession.time}</div>

          {/* Date & Time editing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date</label>
              <input type="date" value={editingSession.date} onChange={e => setEditingSession(s => s ? { ...s, date: e.target.value } : s)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Time</label>
              <input type="time" value={editingSession.time} onChange={e => setEditingSession(s => s ? { ...s, time: e.target.value } : s)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Duration (minutes)</label>
            <select value={editingSession.duration ?? classDuration} onChange={e => setEditingSession(s => s ? { ...s, duration: Number(e.target.value) } : s)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }}>
              {[30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Status</label>
            <select value={editingSession.status} onChange={e => setEditingSession(s => s ? { ...s, status: e.target.value as Session['status'] } : s)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Session Notes</label>
            <textarea value={editingSession.notes ?? ''} onChange={e => setEditingSession(s => s ? { ...s, notes: e.target.value } : s)} rows={3} placeholder="What was covered?" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Homework Assigned</label>
            <input type="text" value={editingSession.homeworkAssigned ?? ''} onChange={e => setEditingSession(s => s ? { ...s, homeworkAssigned: e.target.value } : s)} placeholder="e.g. Chapter 5 exercises" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Session Rating</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setEditingSession(s => s ? { ...s, rating: r as Session['rating'] } : s)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 16, background: (editingSession.rating ?? 0) >= r ? '#fef3c7' : '#f9fafb' }}>⭐</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {editingSession.status === 'scheduled' && (
              <button onClick={() => markAttendedUnpaid(editingSession)} style={{ ...btnStyle, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', marginRight: 'auto' }}>Attended, Pay Later</button>
            )}
            <button onClick={() => setIsSessionDetailOpen(false)} style={btnStyle}>Cancel</button>
            <button onClick={() => { updateSession(editingSession.id, editingSession); setIsSessionDetailOpen(false); }} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, background: '#1e40af', color: '#fff' }}>Save</button>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionModal = () => {
    if (!sessionModal) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Book Session</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>{format(parseISO(sessionModal.date), 'EEEE, MMMM d yyyy')}</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Time</label>
            <input type="time" value={sessionModal.time} onChange={e => setSessionModal(s => s ? { ...s, time: e.target.value } : s)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
          </div>
          {isConflict(sessionModal.date, sessionModal.time, classDuration) && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>
              ⚠ Conflict detected at this time slot.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setSessionModal(null)} style={btnStyle}>Cancel</button>
            <button onClick={() => { bookSession(sessionModal.date, sessionModal.time); setSessionModal(null); }} disabled={isConflict(sessionModal.date, sessionModal.time, classDuration)}
              style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: isConflict(sessionModal.date, sessionModal.time, classDuration) ? 'not-allowed' : 'pointer', fontWeight: 700, background: isConflict(sessionModal.date, sessionModal.time, classDuration) ? '#e5e7eb' : '#1e40af', color: isConflict(sessionModal.date, sessionModal.time, classDuration) ? '#9ca3af' : '#fff' }}>Book</button>
          </div>
        </div>
      </div>
    );
  };

  const renderCancelModal = () => {
    if (!cancellingSession) return null;
    const { fee, label } = getCancellationFee(cancellingSession, cancellationPolicy, pricePerSession);
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Cancel Session</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>{format(parseISO(cancellingSession.date), 'EEEE, MMMM d yyyy')} at {cancellingSession.time}</div>
          <div style={{ padding: '12px 14px', background: fee > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${fee > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: fee > 0 ? '#991b1b' : '#166534' }}>{label}</div>
            {fee > 0 && <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>Cancellation fee: {currency}{fee.toFixed(2)}</div>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for cancellation</label>
            <input type="text" value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} placeholder="e.g. Sick, travel, schedule conflict" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setIsCancelModalOpen(false)} style={btnStyle}>Keep Session</button>
            <button onClick={confirmCancellation} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, background: '#ef4444', color: '#fff' }}>
              {fee > 0 ? `Cancel & Charge ${currency}${fee.toFixed(2)}` : 'Cancel (Free)'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRescheduleModal = () => {
    if (!rescheduleSession) return null;
    const hasConflict = rescheduleDate && rescheduleTime && isConflict(rescheduleDate, rescheduleTime, classDuration, rescheduleSession.id);
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Reschedule Session</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Originally: {format(parseISO(rescheduleSession.date), 'EEE, MMM d')} at {rescheduleSession.time}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>New Date</label>
              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>New Time</label>
              <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
            </div>
          </div>
          {hasConflict && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b', marginBottom: 12 }}>⚠ Conflict at this new time!</div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setIsRescheduleModalOpen(false)} style={btnStyle}>Cancel</button>
            <button onClick={confirmReschedule} disabled={!!hasConflict} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: hasConflict ? 'not-allowed' : 'pointer', fontWeight: 700, background: hasConflict ? '#e5e7eb' : '#8b5cf6', color: hasConflict ? '#9ca3af' : '#fff' }}>Reschedule</button>
          </div>
        </div>
      </div>
    );
  };

  const renderBlockTimeModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Block Time</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date</label>
          <input type="date" value={newBlockedTime.date ?? ''} onChange={e => setNewBlockedTime(p => ({ ...p, date: e.target.value }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Label</label>
          <input type="text" value={newBlockedTime.label ?? ''} onChange={e => setNewBlockedTime(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Holiday, Vacation" style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={newBlockedTime.allDay ?? true} onChange={e => setNewBlockedTime(p => ({ ...p, allDay: e.target.checked }))} />
            All day
          </label>
        </div>
        {!newBlockedTime.allDay && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Start</label>
              <input type="time" value={newBlockedTime.startTime ?? ''} onChange={e => setNewBlockedTime(p => ({ ...p, startTime: e.target.value }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>End</label>
              <input type="time" value={newBlockedTime.endTime ?? ''} onChange={e => setNewBlockedTime(p => ({ ...p, endTime: e.target.value }))} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, fontSize: 14 }} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setIsBlockTimeModalOpen(false)} style={btnStyle}>Cancel</button>
          <button onClick={addBlockedTime} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, background: '#ef4444', color: '#fff' }}>Block</button>
        </div>
      </div>
    </div>
  );

  const renderWaitlistModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 360 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Add to Waitlist</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Preferred Date</label>
          <input type="date" value={waitlistDate} onChange={e => setWaitlistDate(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Preferred Time</label>
          <input type="time" value={waitlistTime} onChange={e => setWaitlistTime(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setIsWaitlistModalOpen(false)} style={btnStyle}>Cancel</button>
          <button onClick={addToWaitlist} disabled={!waitlistDate} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, cursor: waitlistDate ? 'pointer' : 'not-allowed', fontWeight: 700, background: waitlistDate ? '#1e40af' : '#e5e7eb', color: waitlistDate ? '#fff' : '#9ca3af' }}>Add to Waitlist</button>
        </div>
      </div>
    </div>
  );

  // ── Print area ────────────────────────────────────────────────────
  const renderPrintArea = () => (
    <div id="invoice-print-area" style={{ display: 'none' }}>
      <style>{`@media print { body * { visibility: hidden; } #invoice-print-area, #invoice-print-area * { visibility: visible; } #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; font-family: sans-serif; } }`}</style>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e40af' }}>Invoice & Progress Report</h1>
        <p style={{ fontSize: 16 }}>Prepared for: <strong>{learner.name}</strong></p>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[['Account Balance', `${currency}${accountBalance.toFixed(2)}`], ['Sessions Remaining', activePackage?.remaining ?? 0], ['Total Revenue', `${currency}${totalRevenue.toFixed(2)}`]].map(([l, v]) => (
          <div key={l as string} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase' }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1e40af' }}>{v}</div>
          </div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Date', 'Time', 'Duration', 'Status', 'Amount'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {(activePackage?.scheduledSessions ?? []).map(s => (
            <tr key={s.id}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{format(parseISO(s.date), 'MMM d, yyyy')}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{s.time}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{s.duration ?? classDuration}min</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{STATUS_CONFIG[s.status].label}</td>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{s.status === 'completed' ? `${currency}${pricePerSession.toFixed(2)}` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────
  const tabs: { key: typeof activeTab; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview', badge: reminders.length || undefined },
    { key: 'sessions', label: 'Sessions' },
    { key: 'packages', label: 'Packages' },
    { key: 'finance', label: 'Finance', badge: paymentRecords.filter(p => p.status !== 'paid').length || undefined },
    { key: 'analytics', label: 'Analytics' },
    { key: 'automation', label: 'Automation' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#93c5fd', marginBottom: 4 }}>Booking System</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{learner.name}</div>
            {learner.timezone && <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 2 }}>🌐 {learner.timezone}</div>}
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Balance', value: `${currency}${accountBalance.toFixed(2)}` },
              { label: 'Sessions Left', value: activePackage?.remaining ?? 0 },
              { label: 'Streak', value: `${streak} 🔥` },
              ...(pendingDebt > 0 ? [{ label: 'Pending Debt', value: `${currency}${pendingDebt.toFixed(2)}` }] : []),
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#93c5fd' }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{item.value}</div>
              </div>
            ))}
            {googleConnected && <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11 }}>📅 Google Synced</div>}
          </div>
        </div>
      </div>

      {purchaseMessage && (
        <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: purchaseMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${purchaseMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`, color: purchaseMessage.type === 'success' ? '#166534' : '#991b1b' }}>{purchaseMessage.text}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ ...tabBtnStyle(activeTab === t.key), position: 'relative' }}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'sessions' && renderSessions()}
      {activeTab === 'packages' && renderPackages()}
      {activeTab === 'finance' && renderFinance()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'automation' && renderAutomation()}
      {activeTab === 'settings' && renderSettings()}

      {renderPrintArea()}

      {isBalanceModalOpen && renderBalanceModal()}
      {isInvoiceModalOpen && renderInvoiceModal()}
      {isSessionDetailOpen && renderSessionDetailModal()}
      {sessionModal && renderSessionModal()}
      {isCancelModalOpen && renderCancelModal()}
      {isRescheduleModalOpen && renderRescheduleModal()}
      {isBlockTimeModalOpen && renderBlockTimeModal()}
      {isWaitlistModalOpen && renderWaitlistModal()}
    </div>
  );
};

export default BookingSystem;