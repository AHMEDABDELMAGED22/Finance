export type WalletType = 'cash' | 'vodafone_cash' | 'instapay';
export type LessonStatus = 'completed' | 'cancelled' | 'postponed';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentSchedule = 'per_lesson' | 'monthly' | 'bimonthly' | 'package' | 'irregular';
export type IncomeSourceType = 'center_student_pays' | 'center_pays' | 'self_collect' | 'online';

export interface Wallet {
  id: string;
  type: WalletType;
  name: string;
  balance: number;
  updatedAt: string;
}

export interface IncomeSource {
  id: string;
  name: string;
  nameAr: string;
  type: IncomeSourceType;
  paymentSchedule: PaymentSchedule;
  ratePerLesson?: number;
  monthlyRate?: number;
  packageLessons?: number;
  packageRate?: number;
  roomRental?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  nameAr: string;
  incomeSourceId: string;
  subject: string;
  ratePerLesson?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Lesson {
  id: string;
  date: string;
  studentId: string;
  studentName?: string;
  subject: string;
  incomeSourceId: string;
  status: LessonStatus;
  amountEarned: number;
  amountReceived: number;
  paymentWalletId?: string;
  centerShare?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category?: string;
  walletId: string;
  targetWalletId?: string;
  incomeSourceId?: string;
  lessonId?: string;
  paymentId?: string;
  settlementId?: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Obligation {
  id: string;
  name: string;
  nameAr: string;
  totalAmount: number;
  reservedAmount: number;
  dueDate: string;
  isRecurring: boolean;
  recurringDay?: number;
  status: 'active' | 'completed' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  darkMode: boolean;
  language: 'ar' | 'en';
  currency: string;
  lastBackup?: string;
}

// ==================== Center Student Management ====================

export type BillingType = 'per_lesson' | 'monthly' | 'agreed';
export type StudentPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'unknown';
export type PaymentReceivedBy = 'me' | 'center';

export interface CenterStudent {
  id: string;
  centerId: string;
  name: string;
  group?: string;
  subject?: string;
  ratePerLesson?: number;
  monthlyRate?: number;
  agreedAmount?: number;
  billingType: BillingType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSession {
  id: string;
  studentId: string;
  centerId: string;
  date: string;
  status: 'completed' | 'cancelled' | 'postponed';
  amountEarned: number;
  notes?: string;
  createdAt: string;
}

export interface StudentPayment {
  id: string;
  studentId: string;
  centerId: string;
  date: string;
  amount: number;
  paymentMethod: WalletType;
  receivedBy: PaymentReceivedBy;
  walletId?: string;
  myShare?: number;
  centerShare?: number;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface CenterSettlement {
  id: string;
  centerId: string;
  date: string;
  amount: number;
  walletId: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface CenterGroupSession {
  id: string;
  centerId: string;
  sessionNumber: number;
  date: string;
  topic?: string;
  attendeeStudentIds: string[];
  roomRentalAmount?: number;
  notes?: string;
  createdAt: string;
}
