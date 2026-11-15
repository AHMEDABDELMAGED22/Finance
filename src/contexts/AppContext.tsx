'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import * as db from '@/db/database';
import { Wallet, IncomeSource, Lesson, Transaction, ExpenseCategory, Obligation, AppSettings } from '@/db/types';

interface AppContextType {
  wallets: Wallet[];
  incomeSources: IncomeSource[];
  lessons: Lesson[];
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  obligations: Obligation[];
  settings: AppSettings;
  totalBalance: number;
  totalReserved: number;
  availableBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  outstandingPayments: number;
  refreshData: () => void;
  updateWalletBalance: (walletId: string, balance: number) => void;
  addLesson: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  addExpense: (amount: number, category: string, walletId: string, date: string, description?: string, incomeSourceId?: string) => void;
  addIncome: (amount: number, walletId: string, date: string, incomeSourceId?: string, description?: string) => void;
  addTransfer: (amount: number, fromWalletId: string, toWalletId: string, date: string, description?: string) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addObligation: (obligation: Omit<Obligation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateObligation: (id: string, updates: Partial<Obligation>) => void;
  deleteObligation: (id: string) => void;
  reserveForObligation: (id: string, amount: number) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addExpenseCategory: (name: string, nameAr: string, icon: string) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ id: 'settings', darkMode: false, language: 'ar', currency: 'EGP' });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(0);

  const refreshData = useCallback(() => {
    setWallets(db.getWallets());
    setIncomeSources(db.getIncomeSources());
    setLessons(db.getLessons());
    setTransactions(db.getTransactions());
    setExpenseCategories(db.getExpenseCategories());
    setObligations(db.getObligations());
    setSettings(db.getSettings());
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
  }, []);

  useEffect(() => {
    refreshData();
    setMounted(true);

    const handleSync = () => {
      refreshData();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('visibilitychange', handleSync);
    };
  }, [refreshData]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalReserved = obligations.filter(o => o.status === 'active').reduce((sum, o) => sum + o.reservedAmount, 0);
  const availableBalance = totalBalance - totalReserved;

  const monthlyIncome = useMemo(() => transactions
    .filter(t => {
      if (t.type !== 'income') return false;
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0), [transactions, currentYear, currentMonth]);

  const monthlyExpenses = useMemo(() => transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0), [transactions, currentYear, currentMonth]);

  const outstandingPayments = useMemo(() => lessons
    .filter(l => l.status === 'completed')
    .reduce((sum, l) => sum + Math.max(0, l.amountEarned - l.amountReceived), 0), [lessons]);

  const value: AppContextType = {
    wallets, incomeSources, lessons, transactions, expenseCategories, obligations, settings,
    totalBalance, totalReserved, availableBalance, monthlyIncome, monthlyExpenses, outstandingPayments,
    refreshData,
    updateWalletBalance: (walletId, balance) => { db.updateWalletBalance(walletId, balance); refreshData(); },
    addLesson: (lesson) => { db.addLesson(lesson); refreshData(); },
    updateLesson: (id, updates) => { db.updateLesson(id, updates); refreshData(); },
    deleteLesson: (id) => { db.deleteLesson(id); refreshData(); },
    addExpense: (amount, category, walletId, date, desc, srcId) => { db.addExpense(amount, category, walletId, date, desc, srcId); refreshData(); },
    addIncome: (amount, walletId, date, srcId, desc) => { db.addIncome(amount, walletId, date, srcId, desc); refreshData(); },
    addTransfer: (amount, from, to, date, desc) => { db.addTransfer(amount, from, to, date, desc); refreshData(); },
    updateTransaction: (id, updates) => { db.updateTransaction(id, updates); refreshData(); },
    deleteTransaction: (id) => { db.deleteTransaction(id); refreshData(); },
    addObligation: (ob) => { db.addObligation(ob); refreshData(); },
    updateObligation: (id, updates) => { db.updateObligation(id, updates); refreshData(); },
    deleteObligation: (id) => { db.deleteObligation(id); refreshData(); },
    reserveForObligation: (id, amount) => { db.reserveForObligation(id, amount); refreshData(); },
    updateSettings: (updates) => { db.updateSettings(updates); refreshData(); },
    addExpenseCategory: (name, nameAr, icon) => { db.addExpenseCategory(name, nameAr, icon); refreshData(); },
    exportData: () => db.exportAllData(),
    importData: (json) => { const ok = db.importAllData(json); if (ok) refreshData(); return ok; },
    activeModal, setActiveModal,
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
