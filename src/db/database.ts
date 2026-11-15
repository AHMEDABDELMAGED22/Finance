// Database layer using localStorage for persistence
import {
  Wallet, IncomeSource, Student, Lesson, Transaction,
  ExpenseCategory, Obligation, AppSettings,
  WalletType, TransactionType,
  CenterStudent, StudentSession, StudentPayment, CenterSettlement
} from './types';

const STORAGE_KEYS = {
  wallets: 'mmm_wallets',
  incomeSources: 'mmm_income_sources',
  students: 'mmm_students',
  lessons: 'mmm_lessons',
  transactions: 'mmm_transactions',
  expenseCategories: 'mmm_expense_categories',
  obligations: 'mmm_obligations',
  settings: 'mmm_settings',
} as const;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getStore<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ==================== Wallets ====================

export function getWallets(): Wallet[] {
  const wallets = getStore<Wallet>(STORAGE_KEYS.wallets);
  if (wallets.length === 0) {
    const defaults: Wallet[] = [
      { id: 'wallet_cash', type: 'cash', name: 'كاش', balance: 0, updatedAt: new Date().toISOString() },
      { id: 'wallet_vodafone', type: 'vodafone_cash', name: 'فودافون كاش', balance: 0, updatedAt: new Date().toISOString() },
      { id: 'wallet_instapay', type: 'instapay', name: 'إنستاباي / بنك', balance: 0, updatedAt: new Date().toISOString() },
    ];
    setStore(STORAGE_KEYS.wallets, defaults);
    return defaults;
  }
  return wallets;
}

export function updateWalletBalance(walletId: string, newBalance: number): Wallet {
  const wallets = getWallets();
  const idx = wallets.findIndex(w => w.id === walletId);
  if (idx === -1) throw new Error('Wallet not found');
  wallets[idx].balance = newBalance;
  wallets[idx].updatedAt = new Date().toISOString();
  setStore(STORAGE_KEYS.wallets, wallets);
  return wallets[idx];
}

export function adjustWalletBalance(walletId: string, amount: number): void {
  const wallets = getWallets();
  const idx = wallets.findIndex(w => w.id === walletId);
  if (idx === -1) throw new Error('Wallet not found');
  wallets[idx].balance += amount;
  wallets[idx].updatedAt = new Date().toISOString();
  setStore(STORAGE_KEYS.wallets, wallets);
}

// ==================== Income Sources ====================

export function getIncomeSources(): IncomeSource[] {
  const sources = getStore<IncomeSource>(STORAGE_KEYS.incomeSources);
  if (sources.length === 0) {
    const defaults = getDefaultIncomeSources();
    setStore(STORAGE_KEYS.incomeSources, defaults);
    return defaults;
  }
  return sources;
}

export function addIncomeSource(source: Omit<IncomeSource, 'id' | 'createdAt'>): IncomeSource {
  const sources = getIncomeSources();
  const newSource: IncomeSource = { ...source, id: generateId(), createdAt: new Date().toISOString() };
  sources.push(newSource);
  setStore(STORAGE_KEYS.incomeSources, sources);
  return newSource;
}

export function updateIncomeSource(id: string, updates: Partial<IncomeSource>): IncomeSource {
  const sources = getIncomeSources();
  const idx = sources.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Income source not found');
  sources[idx] = { ...sources[idx], ...updates };
  setStore(STORAGE_KEYS.incomeSources, sources);
  return sources[idx];
}

export function deleteIncomeSource(id: string): void {
  const sources = getIncomeSources().filter(s => s.id !== id);
  setStore(STORAGE_KEYS.incomeSources, sources);
}

function getDefaultIncomeSources(): IncomeSource[] {
  return [
    {
      id: 'src_farouk', name: 'Al Farouk Center', nameAr: 'سنتر الفاروق',
      type: 'center_student_pays', paymentSchedule: 'per_lesson',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_manara', name: 'Al Manara Center', nameAr: 'سنتر المنارة',
      type: 'center_pays', paymentSchedule: 'per_lesson',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_roya', name: 'Roya Center', nameAr: 'سنتر رؤيا',
      type: 'center_pays', paymentSchedule: 'per_lesson',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_4geeks', name: '4GEEKS', nameAr: '4GEEKS',
      type: 'self_collect', paymentSchedule: 'per_lesson',
      roomRental: 40,
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_cambridge8', name: 'Cambridge Grade 8 Math', nameAr: 'كامبريدج رياضيات الصف 8',
      type: 'online', paymentSchedule: 'bimonthly',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_cambridge10', name: 'Cambridge Grade 10 Math', nameAr: 'كامبريدج رياضيات الصف 10',
      type: 'online', paymentSchedule: 'bimonthly',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_yahya', name: 'Yahya - Math', nameAr: 'يحيى - رياضيات',
      type: 'online', paymentSchedule: 'bimonthly',
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_ismail', name: 'Ismail - Programming', nameAr: 'إسماعيل - برمجة',
      type: 'online', paymentSchedule: 'irregular',
      ratePerLesson: 150,
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_mohamed', name: 'Mohamed - Jordan - Programming', nameAr: 'محمد - الأردن - برمجة',
      type: 'online', paymentSchedule: 'monthly',
      monthlyRate: 1600,
      isActive: true, createdAt: new Date().toISOString(),
    },
    {
      id: 'src_anasmalek', name: 'Anas & Malek - Math', nameAr: 'أنس ومالك - رياضيات',
      type: 'online', paymentSchedule: 'package',
      packageLessons: 8, packageRate: 1700,
      isActive: true, createdAt: new Date().toISOString(),
    },
  ];
}

// ==================== Students ====================

export function getStudents(): Student[] {
  return getStore<Student>(STORAGE_KEYS.students);
}

export function addStudent(student: Omit<Student, 'id' | 'createdAt'>): Student {
  const students = getStudents();
  const newStudent: Student = { ...student, id: generateId(), createdAt: new Date().toISOString() };
  students.push(newStudent);
  setStore(STORAGE_KEYS.students, students);
  return newStudent;
}

export function updateStudent(id: string, updates: Partial<Student>): Student {
  const students = getStudents();
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Student not found');
  students[idx] = { ...students[idx], ...updates };
  setStore(STORAGE_KEYS.students, students);
  return students[idx];
}

export function deleteStudent(id: string): void {
  const students = getStudents().filter(s => s.id !== id);
  setStore(STORAGE_KEYS.students, students);
}

// ==================== Lessons ====================

export function getLessons(): Lesson[] {
  return getStore<Lesson>(STORAGE_KEYS.lessons);
}

export function addLesson(lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Lesson {
  const lessons = getLessons();
  const now = new Date().toISOString();
  const newLesson: Lesson = { ...lesson, id: generateId(), createdAt: now, updatedAt: now };
  lessons.push(newLesson);
  setStore(STORAGE_KEYS.lessons, lessons);

  // If payment received, update wallet and create transaction
  if (newLesson.amountReceived > 0 && newLesson.paymentWalletId && newLesson.status === 'completed') {
    adjustWalletBalance(newLesson.paymentWalletId, newLesson.amountReceived);
    addTransaction({
      type: 'income',
      amount: newLesson.amountReceived,
      walletId: newLesson.paymentWalletId,
      incomeSourceId: newLesson.incomeSourceId,
      lessonId: newLesson.id,
      description: `درس: ${newLesson.studentName || newLesson.subject}`,
      date: newLesson.date,
    });
  }

  return newLesson;
}

export function updateLesson(id: string, updates: Partial<Lesson>): Lesson {
  const lessons = getLessons();
  const idx = lessons.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Lesson not found');
  lessons[idx] = { ...lessons[idx], ...updates, updatedAt: new Date().toISOString() };
  setStore(STORAGE_KEYS.lessons, lessons);
  return lessons[idx];
}

export function deleteLesson(id: string): void {
  const lessons = getLessons();
  const lesson = lessons.find(l => l.id === id);
  if (lesson && lesson.amountReceived > 0 && lesson.paymentWalletId) {
    // Reverse the wallet adjustment
    adjustWalletBalance(lesson.paymentWalletId, -lesson.amountReceived);
    // Remove associated transaction
    const txns = getTransactions().filter(t => t.lessonId !== id);
    setStore(STORAGE_KEYS.transactions, txns);
  }
  setStore(STORAGE_KEYS.lessons, lessons.filter(l => l.id !== id));
}

// ==================== Transactions ====================

export function getTransactions(): Transaction[] {
  return getStore<Transaction>(STORAGE_KEYS.transactions);
}

export function addTransaction(txn: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transactions = getTransactions();
  const newTxn: Transaction = { ...txn, id: generateId(), createdAt: new Date().toISOString() };
  transactions.push(newTxn);
  setStore(STORAGE_KEYS.transactions, transactions);
  return newTxn;
}

export function addExpense(amount: number, category: string, walletId: string, date: string, description?: string, incomeSourceId?: string): Transaction {
  adjustWalletBalance(walletId, -amount);
  return addTransaction({
    type: 'expense',
    amount,
    category,
    walletId,
    incomeSourceId,
    date,
    description: description || category,
  });
}

export function getCenterExpenses(centerId: string): Transaction[] {
  return getTransactions().filter(t => t.type === 'expense' && (t.incomeSourceId === centerId || (centerId === 'src_4geeks' && t.category === 'إيجار قاعة')));
}

export function addIncome(amount: number, walletId: string, date: string, incomeSourceId?: string, description?: string): Transaction {
  adjustWalletBalance(walletId, amount);
  return addTransaction({
    type: 'income',
    amount,
    walletId,
    incomeSourceId,
    date,
    description: description || 'دخل',
  });
}

export function addTransfer(amount: number, fromWalletId: string, toWalletId: string, date: string, description?: string): Transaction {
  adjustWalletBalance(fromWalletId, -amount);
  adjustWalletBalance(toWalletId, amount);
  return addTransaction({
    type: 'transfer',
    amount,
    walletId: fromWalletId,
    targetWalletId: toWalletId,
    date,
    description: description || 'تحويل داخلي',
  });
}

export function updateTransaction(id: string, updates: Partial<Transaction>): Transaction {
  const txns = getTransactions();
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Transaction not found');
  const old = txns[idx];

  // 1. Reverse old wallet effects
  if (old.type === 'income') {
    adjustWalletBalance(old.walletId, -old.amount);
  } else if (old.type === 'expense') {
    adjustWalletBalance(old.walletId, old.amount);
  } else if (old.type === 'transfer' && old.targetWalletId) {
    adjustWalletBalance(old.walletId, old.amount);
    adjustWalletBalance(old.targetWalletId, -old.amount);
  }

  // 2. Apply updates
  const updated = { ...old, ...updates };
  txns[idx] = updated;
  setStore(STORAGE_KEYS.transactions, txns);

  // 3. Apply new wallet effects
  if (updated.type === 'income') {
    adjustWalletBalance(updated.walletId, updated.amount);
  } else if (updated.type === 'expense') {
    adjustWalletBalance(updated.walletId, -updated.amount);
  } else if (updated.type === 'transfer' && updated.targetWalletId) {
    adjustWalletBalance(updated.walletId, -updated.amount);
    adjustWalletBalance(updated.targetWalletId, updated.amount);
  }

  return updated;
}

export function deleteTransaction(id: string): void {
  const txns = getTransactions();
  const txn = txns.find(t => t.id === id);
  if (!txn) return;

  // Reverse wallet effects
  if (txn.type === 'income') {
    adjustWalletBalance(txn.walletId, -txn.amount);
  } else if (txn.type === 'expense') {
    adjustWalletBalance(txn.walletId, txn.amount);
  } else if (txn.type === 'transfer' && txn.targetWalletId) {
    adjustWalletBalance(txn.walletId, txn.amount);
    adjustWalletBalance(txn.targetWalletId, -txn.amount);
  }

  setStore(STORAGE_KEYS.transactions, txns.filter(t => t.id !== id));
}

// ==================== Expense Categories ====================

export function getExpenseCategories(): ExpenseCategory[] {
  const cats = getStore<ExpenseCategory>(STORAGE_KEYS.expenseCategories);
  if (cats.length === 0) {
    const defaults = getDefaultExpenseCategories();
    setStore(STORAGE_KEYS.expenseCategories, defaults);
    return defaults;
  }
  return cats;
}

export function addExpenseCategory(name: string, nameAr: string, icon: string): ExpenseCategory {
  const cats = getExpenseCategories();
  const newCat: ExpenseCategory = {
    id: generateId(), name, nameAr, icon, isDefault: false, createdAt: new Date().toISOString()
  };
  cats.push(newCat);
  setStore(STORAGE_KEYS.expenseCategories, cats);
  return newCat;
}

export function deleteExpenseCategory(id: string): void {
  const cats = getExpenseCategories().filter(c => c.id !== id || c.isDefault);
  setStore(STORAGE_KEYS.expenseCategories, cats);
}

function getDefaultExpenseCategories(): ExpenseCategory[] {
  return [
    { id: 'cat_transport', name: 'Transportation', nameAr: 'مواصلات', icon: '🚗', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_food', name: 'Food & Drinks', nameAr: 'أكل ومشروبات', icon: '🍔', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_college', name: 'College', nameAr: 'كلية', icon: '🎓', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_shopping', name: 'Personal Shopping', nameAr: 'مشتريات شخصية', icon: '🛍️', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_work', name: 'Teaching / Work', nameAr: 'تدريس / شغل', icon: '💼', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_rental', name: 'Room Rental', nameAr: 'إيجار قاعة', icon: '🏠', isDefault: true, createdAt: new Date().toISOString() },
    { id: 'cat_other', name: 'Other', nameAr: 'أخرى', icon: '📦', isDefault: true, createdAt: new Date().toISOString() },
  ];
}

// ==================== Obligations ====================

export function getObligations(): Obligation[] {
  const obs = getStore<Obligation>(STORAGE_KEYS.obligations);
  if (obs.length === 0) {
    const defaults = getDefaultObligations();
    setStore(STORAGE_KEYS.obligations, defaults);
    return defaults;
  }
  return obs;
}

export function addObligation(obligation: Omit<Obligation, 'id' | 'createdAt' | 'updatedAt'>): Obligation {
  const obs = getObligations();
  const now = new Date().toISOString();
  const newOb: Obligation = { ...obligation, id: generateId(), createdAt: now, updatedAt: now };
  obs.push(newOb);
  setStore(STORAGE_KEYS.obligations, obs);
  return newOb;
}

export function updateObligation(id: string, updates: Partial<Obligation>): Obligation {
  const obs = getObligations();
  const idx = obs.findIndex(o => o.id === id);
  if (idx === -1) throw new Error('Obligation not found');
  obs[idx] = { ...obs[idx], ...updates, updatedAt: new Date().toISOString() };
  setStore(STORAGE_KEYS.obligations, obs);
  return obs[idx];
}

export function deleteObligation(id: string): void {
  const obs = getObligations().filter(o => o.id !== id);
  setStore(STORAGE_KEYS.obligations, obs);
}

export function reserveForObligation(id: string, amount: number): Obligation {
  return updateObligation(id, { reservedAmount: amount });
}

function getDefaultObligations(): Obligation[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'ob_association', name: 'Monthly Association', nameAr: 'الجمعية الشهرية',
      totalAmount: 7000, reservedAmount: 0,
      dueDate: getNextDueDate(21),
      isRecurring: true, recurringDay: 21,
      status: 'active', createdAt: now, updatedAt: now,
    },
    {
      id: 'ob_college', name: 'College Fees', nameAr: 'مصاريف الكلية',
      totalAmount: 7000, reservedAmount: 0,
      dueDate: '2027-01-15',
      isRecurring: false,
      status: 'active', createdAt: now, updatedAt: now,
    },
  ];
}

function getNextDueDate(day: number): string {
  const now = new Date();
  let date = new Date(now.getFullYear(), now.getMonth(), day);
  if (date <= now) {
    date = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  return date.toISOString().split('T')[0];
}

// ==================== Settings ====================

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return { id: 'settings', darkMode: false, language: 'ar', currency: 'EGP' };
  const data = localStorage.getItem(STORAGE_KEYS.settings);
  if (!data) {
    const defaults: AppSettings = { id: 'settings', darkMode: false, language: 'ar', currency: 'EGP' };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const settings = { ...getSettings(), ...updates };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  return settings;
}

// ==================== Analytics / Calculations ====================

export function getTotalBalance(): number {
  return getWallets().reduce((sum, w) => sum + w.balance, 0);
}

export function getTotalReserved(): number {
  return getObligations()
    .filter(o => o.status === 'active')
    .reduce((sum, o) => sum + o.reservedAmount, 0);
}

export function getAvailableBalance(): number {
  return getTotalBalance() - getTotalReserved();
}

export function getMonthlyIncome(year?: number, month?: number): number {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  return getTransactions()
    .filter(t => {
      if (t.type !== 'income') return false;
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthlyExpenses(year?: number, month?: number): number {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  return getTransactions()
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getOutstandingPayments(): number {
  return getLessons()
    .filter(l => l.status === 'completed')
    .reduce((sum, l) => sum + (l.amountEarned - l.amountReceived), 0);
}

export function getMonthlyExpenseBreakdown(year?: number, month?: number): Record<string, number> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const breakdown: Record<string, number> = {};
  getTransactions()
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .forEach(t => {
      const cat = t.category || 'أخرى';
      breakdown[cat] = (breakdown[cat] || 0) + t.amount;
    });
  return breakdown;
}

// ==================== Center Students ====================

const CENTER_KEYS = {
  students: 'mmm_center_students',
  sessions: 'mmm_student_sessions',
  payments: 'mmm_student_payments',
  settlements: 'mmm_center_settlements',
} as const;

export function getCenterStudents(centerId?: string): CenterStudent[] {
  const all = getStore<CenterStudent>(CENTER_KEYS.students);
  return centerId ? all.filter(s => s.centerId === centerId) : all;
}

export function addCenterStudent(student: Omit<CenterStudent, 'id' | 'createdAt' | 'updatedAt'>): CenterStudent {
  const students = getStore<CenterStudent>(CENTER_KEYS.students);
  const now = new Date().toISOString();
  const s: CenterStudent = { ...student, id: generateId(), createdAt: now, updatedAt: now };
  students.push(s);
  setStore(CENTER_KEYS.students, students);
  return s;
}

export function updateCenterStudent(id: string, updates: Partial<CenterStudent>): CenterStudent {
  const students = getStore<CenterStudent>(CENTER_KEYS.students);
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Student not found');
  students[idx] = { ...students[idx], ...updates, updatedAt: new Date().toISOString() };
  setStore(CENTER_KEYS.students, students);
  return students[idx];
}

export function deleteCenterStudent(id: string): void {
  setStore(CENTER_KEYS.students, getStore<CenterStudent>(CENTER_KEYS.students).filter(s => s.id !== id));
  // Also delete related sessions and payments
  setStore(CENTER_KEYS.sessions, getStore<StudentSession>(CENTER_KEYS.sessions).filter(s => s.studentId !== id));
  setStore(CENTER_KEYS.payments, getStore<StudentPayment>(CENTER_KEYS.payments).filter(p => p.studentId !== id));
}

// ==================== Student Sessions ====================

export function getStudentSessions(centerId?: string, studentId?: string): StudentSession[] {
  let all = getStore<StudentSession>(CENTER_KEYS.sessions);
  if (centerId) all = all.filter(s => s.centerId === centerId);
  if (studentId) all = all.filter(s => s.studentId === studentId);
  return all;
}

export function addStudentSession(session: Omit<StudentSession, 'id' | 'createdAt'>): StudentSession {
  const sessions = getStore<StudentSession>(CENTER_KEYS.sessions);
  const s: StudentSession = { ...session, id: generateId(), createdAt: new Date().toISOString() };
  sessions.push(s);
  setStore(CENTER_KEYS.sessions, sessions);
  return s;
}

export function updateStudentSession(id: string, updates: Partial<StudentSession>): void {
  const sessions = getStore<StudentSession>(CENTER_KEYS.sessions);
  const idx = sessions.findIndex(s => s.id === id);
  if (idx !== -1) { sessions[idx] = { ...sessions[idx], ...updates }; setStore(CENTER_KEYS.sessions, sessions); }
}

export function deleteStudentSession(id: string): void {
  setStore(CENTER_KEYS.sessions, getStore<StudentSession>(CENTER_KEYS.sessions).filter(s => s.id !== id));
}

// ==================== Student Payments ====================

export function getStudentPayments(centerId?: string, studentId?: string): StudentPayment[] {
  let all = getStore<StudentPayment>(CENTER_KEYS.payments);
  if (centerId) all = all.filter(p => p.centerId === centerId);
  if (studentId) all = all.filter(p => p.studentId === studentId);
  return all;
}

export function addStudentPayment(payment: Omit<StudentPayment, 'id' | 'createdAt'>): StudentPayment {
  const payments = getStore<StudentPayment>(CENTER_KEYS.payments);
  const p: StudentPayment = { ...payment, id: generateId(), createdAt: new Date().toISOString() };
  payments.push(p);
  setStore(CENTER_KEYS.payments, payments);
  // If received by me, add to wallet
  if (p.receivedBy === 'me' && p.walletId) {
    const amountToWallet = p.myShare != null ? p.myShare : p.amount;
    adjustWalletBalance(p.walletId, amountToWallet);
  }
  return p;
}

export function deleteStudentPayment(id: string): void {
  const payments = getStore<StudentPayment>(CENTER_KEYS.payments);
  const p = payments.find(x => x.id === id);
  if (p && p.receivedBy === 'me' && p.walletId) {
    const amountToReverse = p.myShare != null ? p.myShare : p.amount;
    adjustWalletBalance(p.walletId, -amountToReverse);
  }
  setStore(CENTER_KEYS.payments, payments.filter(x => x.id !== id));
}

// ==================== Center Settlements ====================

export function getCenterSettlements(centerId?: string): CenterSettlement[] {
  const all = getStore<CenterSettlement>(CENTER_KEYS.settlements);
  return centerId ? all.filter(s => s.centerId === centerId) : all;
}

export function addCenterSettlement(settlement: Omit<CenterSettlement, 'id' | 'createdAt'>): CenterSettlement {
  const settlements = getStore<CenterSettlement>(CENTER_KEYS.settlements);
  const s: CenterSettlement = { ...settlement, id: generateId(), createdAt: new Date().toISOString() };
  settlements.push(s);
  setStore(CENTER_KEYS.settlements, settlements);
  // Add to wallet
  adjustWalletBalance(s.walletId, s.amount);
  return s;
}

export function deleteCenterSettlement(id: string): void {
  const settlements = getStore<CenterSettlement>(CENTER_KEYS.settlements);
  const s = settlements.find(x => x.id === id);
  if (s) adjustWalletBalance(s.walletId, -s.amount);
  setStore(CENTER_KEYS.settlements, settlements.filter(x => x.id !== id));
}

// ==================== Export / Import ====================

export function exportAllData(): string {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    wallets: getWallets(),
    incomeSources: getIncomeSources(),
    students: getStudents(),
    lessons: getLessons(),
    transactions: getTransactions(),
    expenseCategories: getExpenseCategories(),
    obligations: getObligations(),
    settings: getSettings(),
    centerStudents: getCenterStudents(),
    studentSessions: getStudentSessions(),
    studentPayments: getStudentPayments(),
    centerSettlements: getCenterSettlements(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version) throw new Error('Invalid backup file');
    if (data.wallets) setStore(STORAGE_KEYS.wallets, data.wallets);
    if (data.incomeSources) setStore(STORAGE_KEYS.incomeSources, data.incomeSources);
    if (data.students) setStore(STORAGE_KEYS.students, data.students);
    if (data.lessons) setStore(STORAGE_KEYS.lessons, data.lessons);
    if (data.transactions) setStore(STORAGE_KEYS.transactions, data.transactions);
    if (data.expenseCategories) setStore(STORAGE_KEYS.expenseCategories, data.expenseCategories);
    if (data.obligations) setStore(STORAGE_KEYS.obligations, data.obligations);
    if (data.settings) localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data.settings));
    if (data.centerStudents) setStore('mmm_center_students', data.centerStudents);
    if (data.studentSessions) setStore('mmm_student_sessions', data.studentSessions);
    if (data.studentPayments) setStore('mmm_student_payments', data.studentPayments);
    if (data.centerSettlements) setStore('mmm_center_settlements', data.centerSettlements);
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}
