import { create } from 'zustand';
import { idbZustandStorage } from '../utils/storageAdapter';
import { persist, createJSONStorage } from 'zustand/middleware';

// Reusing types from BookingSystem.tsx
export interface Session {
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

export interface Package {
  id: string;
  sessions: number;
  label: string;
  discountPercent: number;
  color: string;
  badge?: string;
}

export interface FundLog {
  id: string;
  amount: number;
  reason: string;
  date: string;
  type: 'add' | 'subtract';
}

export interface PaymentRecord {
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

export interface ActivePackage {
  id: string; 
  sessions: number; 
  price: number; 
  remaining: number; 
  purchasedAt: string; 
  scheduledSessions: Session[];
}

export interface WaitlistEntry {
  id: string;
  date: string;
  time: string;
  requestedAt: string;
  notified: boolean;
}

export interface BlockedTime {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  label?: string;
}

export interface CancellationPolicy {
  freeCancellationHours: number;
  halfChargeCancellationHours: number;
}

export interface BufferSettings {
  enabled: boolean;
  minutes: number;
}

export interface RecurringRule {
  dayOfWeek: number;
  time: string;
  active: boolean;
}

export interface GlobalBookingState {
  // We store global package definitions etc
  packages: Package[];
  cancellationPolicy: CancellationPolicy;
  bufferSettings: BufferSettings;
  blockedTimes: BlockedTime[];
  recurringRules: RecurringRule[];
  autoBookWeeks: number;

  setGlobalPackages: (packages: Package[]) => void;
  setGlobalCancellationPolicy: (policy: CancellationPolicy) => void;
  setGlobalBufferSettings: (settings: BufferSettings) => void;
  addBlockedTime: (blocked: BlockedTime) => void;
  removeBlockedTime: (id: string) => void;
  setRecurringRules: (rules: RecurringRule[]) => void;
  setAutoBookWeeks: (weeks: number) => void;
  
  // Storage per learner ID
  learnerData: Record<string, LearnerBookingData>;
  updateLearnerData: (learnerId: string, data: Partial<LearnerBookingData>) => void;
}

export interface LearnerBookingData {
  pricePerHour: number;
  classDuration: number;
  currency: string;
  accountBalance: number;
  balanceLogs: FundLog[];
  paymentRecords: PaymentRecord[];
  activePackage: ActivePackage | null;
  waitlist: WaitlistEntry[];
  dismissedReminders: string[];
}

export const useBookingStore = create<GlobalBookingState>()(
  persist(
    (set, get) => ({
      packages: [
        { id: 'p1', sessions: 5, label: '5 Sessions', discountPercent: 5, color: '#e0f2fe' },
        { id: 'p2', sessions: 10, label: '10 Sessions', discountPercent: 10, color: '#dcfce7', badge: 'Popular' },
        { id: 'p3', sessions: 20, label: '20 Sessions', discountPercent: 20, color: '#f3e8ff', badge: 'Best Value' },
      ],
      cancellationPolicy: { freeCancellationHours: 24, halfChargeCancellationHours: 12 },
      bufferSettings: { enabled: true, minutes: 15 },
      blockedTimes: [],
      recurringRules: [
        { dayOfWeek: 1, time: '10:00', active: false },
        { dayOfWeek: 3, time: '10:00', active: false },
        { dayOfWeek: 5, time: '10:00', active: false },
      ],
      autoBookWeeks: 4,
      learnerData: {},

      setGlobalPackages: (packages) => set({ packages }),
      setGlobalCancellationPolicy: (cancellationPolicy) => set({ cancellationPolicy }),
      setGlobalBufferSettings: (bufferSettings) => set({ bufferSettings }),
      addBlockedTime: (blocked) => set((state) => ({ blockedTimes: [...state.blockedTimes, blocked] })),
      removeBlockedTime: (id) => set((state) => ({ blockedTimes: state.blockedTimes.filter(b => b.id !== id) })),
      setRecurringRules: (recurringRules) => set({ recurringRules }),
      setAutoBookWeeks: (autoBookWeeks) => set({ autoBookWeeks }),

      updateLearnerData: (learnerId, data) => set((state) => {
        const existingData = state.learnerData[learnerId] || {
          pricePerHour: 25,
          classDuration: 60,
          currency: '$',
          accountBalance: 0,
          balanceLogs: [],
          paymentRecords: [],
          activePackage: null,
          waitlist: [],
          dismissedReminders: [],
        };
        return {
          learnerData: {
            ...state.learnerData,
            [learnerId]: { ...existingData, ...data }
          }
        };
      })
    }),
    {
      name: 'booking-storage',
      storage: createJSONStorage(() => idbZustandStorage),
    }
  )
);
