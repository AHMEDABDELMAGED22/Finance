'use client';

import { useState, useEffect, useMemo } from 'react';
import * as db from '@/db/database';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, getToday, getDaysUntil, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';
import EditTransactionModal from '@/components/EditTransactionModal';

export default function Dashboard() {
  const app = useApp();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editTxnId, setEditTxnId] = useState<string | null>(null);
  const [txnFilter, setTxnFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    app.refreshData();
  }, []);

  // Sorted transactions: newest date first, then newest createdAt first
  const sortedTransactions = useMemo(() => {
    return [...app.transactions].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [app.transactions]);

  const filteredTransactions = useMemo(() => {
    if (txnFilter === 'income') return sortedTransactions.filter(t => t.type === 'income');
    if (txnFilter === 'expense') return sortedTransactions.filter(t => t.type === 'expense');
    return sortedTransactions;
  }, [sortedTransactions, txnFilter]);

  // Centers that passed 8 sessions and have pending money owed to tutor
  const centersPassed8 = useMemo(() => {
    const centers = ['src_farouk', 'src_manara', 'src_roya', 'src_4geeks'];
    return centers
      .map(cId => {
        const stats = db.getCenterCycleStats(cId);
        const src = app.incomeSources.find(s => s.id === cId);
        return {
          id: cId,
          name: src?.nameAr || cId,
          hasPassed8: stats.hasPassed8,
          owed: stats.owedToMe,
          cycles: stats.completedCycles,
        };
      })
      .filter(c => c.hasPassed8 && c.owed > 0);
  }, [app.incomeSources, app.transactions]);

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">فلوسي</h1>
          <p className="text-sm text-gray-500">إدارة أموالك</p>
        </div>
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">💰</div>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-bl from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg space-y-3">
        <div>
          <p className="text-emerald-100 text-xs mb-1">إجمالي الرصيد الفعلي (في كل المحافظ)</p>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(app.totalBalance)}</p>
        </div>

        {/* Center Owed Share (if any) */}
        {app.totalOwedToCenters > 0 && (
          <div className="bg-amber-500/25 border border-amber-300/40 rounded-xl p-3 text-white">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-1.5 text-amber-100 font-bold">
                <span>🏫</span> مستحق للسناتر (في المحافظ)
              </span>
              <span className="font-extrabold text-amber-200 text-base">-{formatCurrency(app.totalOwedToCenters)}</span>
            </div>
            <p className="text-[11px] text-amber-100/90 mt-1">
              مبالغ محصلة في إنستاباي/المحافظ وتخص نصيب السناتر لحين تسليمها
            </p>
          </div>
        )}

        {/* Reserved for obligations or Net Available */}
        {(app.totalReserved > 0 || app.totalOwedToCenters > 0) && (
          <div className="bg-white/15 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-100 font-medium">المتاح الصافي للإنفاق الشخصي</span>
              <span className="font-extrabold text-xl text-white">{formatCurrency(app.availableBalance)}</span>
            </div>
            <div className="text-[11px] text-emerald-100/80 flex flex-wrap gap-2 pt-1 border-t border-white/10">
              <span>تم استبعاد:</span>
              {app.totalOwedToCenters > 0 && <span>• نصيب السناتر ({formatCurrency(app.totalOwedToCenters)})</span>}
              {app.totalReserved > 0 && <span>• الالتزامات المحجوزة ({formatCurrency(app.totalReserved)})</span>}
            </div>
          </div>
        )}
      </div>

      {/* Wallets */}
      <div className="grid grid-cols-3 gap-2">
        {app.wallets.map(w => (
          <div key={w.id} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <span className="text-xl">{getWalletIcon(w.type)}</span>
            <p className="text-[11px] text-gray-500 mt-1 truncate">{w.name}</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(w.balance)}</p>
          </div>
        ))}
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">⬇️</span>
            <span className="text-xs text-gray-500">الدخل هذا الشهر</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(app.monthlyIncome)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-600">⬆️</span>
            <span className="text-xs text-gray-500">المصاريف هذا الشهر</span>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(app.monthlyExpenses)}</p>
        </div>
      </div>

      {/* Outstanding & Reserved & Center Owed */}
      <div className={`grid ${app.totalOwedToCenters > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
        {app.outstandingPayments > 0 && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-[11px] text-amber-800 font-medium mb-1 truncate">💸 مستحقات لم تُستلم</p>
            <p className="text-base font-bold text-amber-700">{formatCurrency(app.outstandingPayments)}</p>
          </div>
        )}
        {app.totalOwedToCenters > 0 && (
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
            <p className="text-[11px] text-orange-800 font-medium mb-1 truncate">🏫 مستحق للسناتر</p>
            <p className="text-base font-bold text-orange-700">{formatCurrency(app.totalOwedToCenters)}</p>
          </div>
        )}
        {app.totalReserved > 0 && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-[11px] text-blue-800 font-medium mb-1 truncate">🔒 محجوز للالتزامات</p>
            <p className="text-base font-bold text-blue-700">{formatCurrency(app.totalReserved)}</p>
          </div>
        )}
      </div>

      {/* Passed 8-Sessions Alert on Dashboard */}
      {centersPassed8.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>🎉</span> سناتر تجاوزت 8 حصص وبانتظار التسوية:
            </span>
            <span className="text-xs font-black text-amber-900">
              {formatCurrency(centersPassed8.reduce((s, c) => s + c.owed, 0))}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {centersPassed8.map(c => (
              <span key={c.id} className="bg-white text-amber-900 border border-amber-200 text-[11px] px-2 py-0.5 rounded-lg font-bold">
                {c.name}: {formatCurrency(c.owed)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setActiveModal('income')} className="bg-green-50 hover:bg-green-100 rounded-xl p-4 text-center transition-colors border border-green-100 active:scale-95">
          <span className="text-2xl block mb-1">➕</span>
          <span className="text-sm font-medium text-green-800">إضافة دخل</span>
        </button>
        <button onClick={() => setActiveModal('expense')} className="bg-red-50 hover:bg-red-100 rounded-xl p-4 text-center transition-colors border border-red-100 active:scale-95">
          <span className="text-2xl block mb-1">➖</span>
          <span className="text-sm font-medium text-red-800">إضافة مصروف</span>
        </button>
        <button onClick={() => setActiveModal('lesson')} className="bg-blue-50 hover:bg-blue-100 rounded-xl p-4 text-center transition-colors border border-blue-100 active:scale-95">
          <span className="text-2xl block mb-1">📚</span>
          <span className="text-sm font-medium text-blue-800">تسجيل درس</span>
        </button>
        <button onClick={() => setActiveModal('transfer')} className="bg-purple-50 hover:bg-purple-100 rounded-xl p-4 text-center transition-colors border border-purple-100 active:scale-95">
          <span className="text-2xl block mb-1">🔄</span>
          <span className="text-sm font-medium text-purple-800">تحويل</span>
        </button>
      </div>

      {/* Upcoming Obligations */}
      {app.obligations.filter(o => o.status === 'active').length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-2">التزامات قادمة</h2>
          <div className="space-y-2">
            {app.obligations.filter(o => o.status === 'active').map(ob => {
              const days = getDaysUntil(ob.dueDate);
              const progress = ob.totalAmount > 0 ? (ob.reservedAmount / ob.totalAmount) * 100 : 0;
              return (
                <div key={ob.id} className={`bg-white rounded-xl p-4 shadow-sm border ${days <= 7 ? 'border-amber-200' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-800">{ob.nameAr}</p>
                      <p className="text-xs text-gray-500">
                        {days > 0 ? `بعد ${days} يوم` : days === 0 ? 'اليوم!' : `متأخر ${Math.abs(days)} يوم`}
                        {ob.isRecurring && ' • 🔄 شهري'}
                      </p>
                    </div>
                    <p className="font-bold text-gray-800">{formatCurrency(ob.totalAmount)}</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">محجوز: {formatCurrency(ob.reservedAmount)} من {formatCurrency(ob.totalAmount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions (Both Income & Expense, Newest First, Filterable) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-gray-800">آخر المعاملات</h2>
          {/* Filter Pills */}
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setTxnFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                txnFilter === 'all' ? 'bg-white text-gray-800 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              الكل ({sortedTransactions.length})
            </button>
            <button
              onClick={() => setTxnFilter('income')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                txnFilter === 'income' ? 'bg-green-600 text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              إيداع ⬇️
            </button>
            <button
              onClick={() => setTxnFilter('expense')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                txnFilter === 'expense' ? 'bg-red-600 text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              سحب ⬆️
            </button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 border border-gray-100">
            <p className="text-2xl mb-1">💸</p>
            <p className="text-xs">لا توجد معاملات مسجلة</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {filteredTransactions.slice(0, 10).map(txn => {
              const wallet = app.wallets.find(w => w.id === txn.walletId);
              const targetWallet = txn.targetWalletId ? app.wallets.find(w => w.id === txn.targetWalletId) : null;
              const isIncome = txn.type === 'income';
              const isExpense = txn.type === 'expense';
              const isTransfer = txn.type === 'transfer';

              return (
                <div
                  key={txn.id}
                  onClick={() => setEditTxnId(txn.id)}
                  className="flex items-center justify-between p-3.5 hover:bg-gray-50/80 cursor-pointer transition-colors active:bg-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {isIncome ? '⬇️' : isExpense ? '⬆️' : '🔄'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-800 leading-snug">{txn.description || (isIncome ? 'دخل' : isExpense ? 'مصروف' : 'تحويل')}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isIncome ? 'bg-green-100 text-green-700' : isExpense ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isIncome ? 'إيداع' : isExpense ? 'سحب' : 'تحويل'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{formatDate(txn.date)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-gray-500 font-medium">
                          {wallet && <span>{getWalletIcon(wallet.type)} {wallet.name}</span>}
                          {isTransfer && targetWallet && <span> ➔ {getWalletIcon(targetWallet.type)} {targetWallet.name}</span>}
                        </span>
                        {txn.category && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[10px]">{txn.category}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-left flex items-center gap-2">
                    <div>
                      <span className={`text-sm font-extrabold block ${
                        isIncome ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {isExpense ? '-' : isIncome ? '+' : ''}{formatCurrency(txn.amount)}
                      </span>
                    </div>
                    <span className="text-gray-300 text-xs">✏️</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Income Modal */}
      <IncomeModal isOpen={activeModal === 'income'} onClose={() => setActiveModal(null)} />
      <ExpenseModal isOpen={activeModal === 'expense'} onClose={() => setActiveModal(null)} />
      <LessonModal isOpen={activeModal === 'lesson'} onClose={() => setActiveModal(null)} />
      <TransferModal isOpen={activeModal === 'transfer'} onClose={() => setActiveModal(null)} />
      {editTxnId && <EditTransactionModal txnId={editTxnId} onClose={() => { setEditTxnId(null); app.refreshData(); }} />}
    </div>
  );
}

// ============ Income Modal ============
function IncomeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('wallet_cash');
  const [sourceId, setSourceId] = useState('');
  const [date, setDate] = useState(getToday());
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    app.addIncome(amt, walletId, date, sourceId || undefined, desc || undefined);
    setAmount(''); setDesc(''); setSourceId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة دخل">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المحفظة</label>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.map(w => (
              <button key={w.id} onClick={() => setWalletId(w.id)}
                className={`p-3 rounded-xl text-center text-sm font-medium transition-colors ${walletId === w.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>
                {w.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مصدر الدخل (اختياري)</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">— اختر —</option>
            {app.incomeSources.filter(s => s.isActive).map(s => (
              <option key={s.id} value={s.id}>{s.nameAr}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="مثال: مرتب شهر نوفمبر"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={handleSave}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!amount || parseFloat(amount) <= 0}>
          حفظ الدخل
        </button>
      </div>
    </Modal>
  );
}

// ============ Expense Modal ============
function ExpenseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [walletId, setWalletId] = useState('wallet_cash');
  const [date, setDate] = useState(getToday());
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !category) return;
    app.addExpense(amt, category, walletId, date, desc || undefined);
    setAmount(''); setCategory(''); setDesc('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مصروف">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
          <div className="grid grid-cols-3 gap-2">
            {app.expenseCategories.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.nameAr)}
                className={`p-3 rounded-xl text-center text-xs font-medium transition-colors ${category === cat.nameAr ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{cat.icon}</span>
                {cat.nameAr}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المحفظة</label>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.map(w => (
              <button key={w.id} onClick={() => setWalletId(w.id)}
                className={`p-3 rounded-xl text-center text-sm font-medium transition-colors ${walletId === w.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>
                {w.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="مثال: أوبر للسنتر"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={handleSave}
          className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-base hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!amount || parseFloat(amount) <= 0 || !category}>
          حفظ المصروف
        </button>
      </div>
    </Modal>
  );
}

// ============ Lesson Modal ============
function LessonModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [date, setDate] = useState(getToday());
  const [sourceId, setSourceId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<'completed' | 'cancelled' | 'postponed'>('completed');
  const [earned, setEarned] = useState('');
  const [received, setReceived] = useState('');
  const [centerShare, setCenterShare] = useState('');
  const [walletId, setWalletId] = useState('wallet_cash');
  const [notes, setNotes] = useState('');

  const selectedSource = app.incomeSources.find(s => s.id === sourceId);
  const showCenterShare = selectedSource && (selectedSource.type === 'center_student_pays' || selectedSource.type === 'self_collect');

  const handleSave = () => {
    if (!sourceId || !studentName) return;
    const amtEarned = parseFloat(earned) || 0;
    const amtReceived = parseFloat(received) || 0;
    app.addLesson({
      date, studentId: '', studentName, subject,
      incomeSourceId: sourceId, status,
      amountEarned: amtEarned,
      amountReceived: status === 'completed' ? amtReceived : 0,
      paymentWalletId: amtReceived > 0 && status === 'completed' ? walletId : undefined,
      centerShare: parseFloat(centerShare) || 0,
      notes,
    });
    setStudentName(''); setSubject(''); setEarned(''); setReceived('');
    setCenterShare(''); setNotes(''); setStatus('completed');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل درس">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مصدر الدخل *</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">— اختر —</option>
            {app.incomeSources.filter(s => s.isActive).map(s => (
              <option key={s.id} value={s.id}>{s.nameAr}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب / المجموعة *</label>
            <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'completed' as const, l: 'مكتمل', c: 'bg-green-500' },
              { v: 'cancelled' as const, l: 'ملغي', c: 'bg-red-500' },
              { v: 'postponed' as const, l: 'مؤجل', c: 'bg-yellow-500' },
            ].map(s => (
              <button key={s.v} onClick={() => setStatus(s.v)}
                className={`p-2 rounded-xl text-sm font-medium transition-colors ${status === s.v ? `${s.c} text-white` : 'bg-gray-100 text-gray-600'}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
        {status === 'completed' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستحق</label>
                <input type="number" value={earned} onChange={e => setEarned(e.target.value)} placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستلم</label>
                <input type="number" value={received} onChange={e => setReceived(e.target.value)} placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            {showCenterShare && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نصيب السنتر / إيجار القاعة</label>
                <input type="number" value={centerShare} onChange={e => setCenterShare(e.target.value)} placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}
            {parseFloat(received) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الاستلام</label>
                <div className="grid grid-cols-3 gap-2">
                  {app.wallets.map(w => (
                    <button key={w.id} onClick={() => setWalletId(w.id)}
                      className={`p-2 rounded-xl text-center text-xs font-medium transition-colors ${walletId === w.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <span className="text-sm block">{getWalletIcon(w.type)}</span>
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={handleSave}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!sourceId || !studentName}>
          حفظ الدرس
        </button>
      </div>
    </Modal>
  );
}

// ============ Transfer Modal ============
function TransferModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [amount, setAmount] = useState('');
  const [fromId, setFromId] = useState('wallet_cash');
  const [toId, setToId] = useState('wallet_vodafone');
  const [date, setDate] = useState(getToday());
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || fromId === toId) return;
    app.addTransfer(amt, fromId, toId, date, desc || undefined);
    setAmount(''); setDesc('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تحويل بين المحافظ">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.map(w => (
              <button key={w.id} onClick={() => { setFromId(w.id); if (toId === w.id) setToId(app.wallets.find(x => x.id !== w.id)?.id || ''); }}
                className={`p-3 rounded-xl text-center text-xs font-medium transition-colors ${fromId === w.id ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>
                {w.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <span className="text-2xl">⬇️</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.filter(w => w.id !== fromId).map(w => (
              <button key={w.id} onClick={() => setToId(w.id)}
                className={`p-3 rounded-xl text-center text-xs font-medium transition-colors ${toId === w.id ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>
                {w.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="مثال: سحب من فودافون كاش"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <p className="text-xs text-gray-400 text-center">⚠️ التحويل الداخلي لن يُحسب كدخل أو مصروف</p>
        <button onClick={handleSave}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-base hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!amount || parseFloat(amount) <= 0 || fromId === toId}>
          تنفيذ التحويل
        </button>
      </div>
    </Modal>
  );
}
