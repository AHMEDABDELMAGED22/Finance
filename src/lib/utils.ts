// Utility functions

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' ج.م';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-EG', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function getMonthName(month: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[month];
}

export function getDaysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getWalletIcon(type: string): string {
  switch (type) {
    case 'cash': return '💵';
    case 'vodafone_cash': return '📱';
    case 'instapay': return '🏦';
    default: return '💰';
  }
}

export function getTransactionIcon(type: string): string {
  switch (type) {
    case 'income': return '⬇️';
    case 'expense': return '⬆️';
    case 'transfer': return '🔄';
    default: return '💰';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-50';
    case 'cancelled': return 'text-red-600 bg-red-50';
    case 'postponed': return 'text-yellow-600 bg-yellow-50';
    case 'active': return 'text-blue-600 bg-blue-50';
    case 'overdue': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'مكتمل';
    case 'cancelled': return 'ملغي';
    case 'postponed': return 'مؤجل';
    case 'active': return 'نشط';
    case 'overdue': return 'متأخر';
    default: return status;
  }
}
