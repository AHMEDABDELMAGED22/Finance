'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, getToday, getMonthName, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function TransactionsPage() {
  const app = useApp();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [curYear, setCurYear] = useState(2026);
  const [curMonth, setCurMonth] = useState(0);

  useEffect(() => {
    const n = new Date();
    setCurYear(n.getFullYear());
    setCurMonth(n.getMonth());
  }, []);

  const monthTransactions = useMemo(() => {
    return app.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [app.transactions, curYear, curMonth]);

  const filtered = filter === 'all' ? monthTransactions : monthTransactions.filter(t => t.type === filter);

  const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;

  // Expense breakdown
  const expenseBreakdown = useMemo(() => {
    const breakdown: { category: string; amount: number; icon: string }[] = [];
    const catMap: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'أخرى';
      catMap[cat] = (catMap[cat] || 0) + t.amount;
    });
    Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, amount]) => {
      const catObj = app.expenseCategories.find(c => c.nameAr === cat);
      breakdown.push({ category: cat, amount, icon: catObj?.icon || '📦' });
    });
    return breakdown;
  }, [monthTransactions, app.expenseCategories]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(t => {
      const dateKey = t.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filtered]);

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      app.deleteTransaction(id);
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">💸 المعاملات</h1>

      {/* Monthly Overview */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
          <p className="text-xs text-green-700 mb-1">الدخل</p>
          <p className="text-sm font-bold text-green-700">{formatCurrency(income)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
          <p className="text-xs text-red-700 mb-1">المصاريف</p>
          <p className="text-sm font-bold text-red-700">{formatCurrency(expenses)}</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${net >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs mb-1 ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>الصافي</p>
          <p className={`text-sm font-bold ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(net)}</p>
        </div>
      </div>

      {/* Expense Breakdown */}
      {expenseBreakdown.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3">تفاصيل المصاريف</h3>
          <div className="space-y-2">
            {expenseBreakdown.map(item => (
              <div key={item.category} className="flex items-center gap-3">
                <span className="text-lg w-6">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.category}</span>
                    <span className="font-medium text-gray-800">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${expenses > 0 ? (item.amount / expenses) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { v: 'all' as const, l: 'الكل' },
          { v: 'income' as const, l: 'دخل' },
          { v: 'expense' as const, l: 'مصاريف' },
          { v: 'transfer' as const, l: 'تحويلات' },
        ].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f.v ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {groupedByDate.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">💸</p>
          <p>لا توجد معاملات هذا الشهر</p>
        </div>
      ) : (
        groupedByDate.map(([date, txns]) => (
          <div key={date}>
            <p className="text-xs font-medium text-gray-400 mb-1 px-1">{formatDate(date)}</p>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {txns.map(txn => {
                const wallet = app.wallets.find(w => w.id === txn.walletId);
                const targetWallet = txn.targetWalletId ? app.wallets.find(w => w.id === txn.targetWalletId) : null;
                return (
                  <div key={txn.id} className="flex items-center justify-between p-3 group">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{txn.type === 'income' ? '⬇️' : txn.type === 'expense' ? '⬆️' : '🔄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{txn.description}</p>
                        <p className="text-xs text-gray-400">
                          {txn.type === 'transfer' && targetWallet
                            ? `${wallet?.name} ← ${targetWallet.name}`
                            : wallet?.name}
                          {txn.category && ` • ${txn.category}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${txn.type === 'income' ? 'text-green-600' : txn.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                        {txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : ''}{formatCurrency(txn.amount)}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs p-1">
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* FAB */}
      <div className="fixed bottom-20 left-4 z-50">
        {showFab && (
          <div className="mb-3 space-y-2 animate-slide-up">
            <button onClick={() => { setShowIncomeModal(true); setShowFab(false); }}
              className="w-full bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2">
              ➕ إضافة دخل
            </button>
            <button onClick={() => { setShowExpenseModal(true); setShowFab(false); }}
              className="w-full bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2">
              ➖ إضافة مصروف
            </button>
            <button onClick={() => { setShowTransferModal(true); setShowFab(false); }}
              className="w-full bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2">
              🔄 تحويل
            </button>
          </div>
        )}
        <button onClick={() => setShowFab(!showFab)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all ${showFab ? 'bg-gray-600 rotate-45' : 'bg-emerald-600'}`}>
          +
        </button>
      </div>

      {/* Modals */}
      <IncomeModal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} />
      <ExpenseModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} />
      <TransferModal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} />
    </div>
  );
}

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
    setAmount(''); setDesc(''); setSourceId(''); onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة دخل">
      <div className="space-y-4">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ"
          className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
        <div className="grid grid-cols-3 gap-2">
          {app.wallets.map(w => (
            <button key={w.id} onClick={() => setWalletId(w.id)}
              className={`p-3 rounded-xl text-center text-sm font-medium ${walletId === w.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <span className="text-lg block">{getWalletIcon(w.type)}</span>{w.name}
            </button>
          ))}
        </div>
        <select value={sourceId} onChange={e => setSourceId(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none">
          <option value="">مصدر الدخل (اختياري)</option>
          {app.incomeSources.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف (اختياري)"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold disabled:opacity-50">حفظ</button>
      </div>
    </Modal>
  );
}

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
    setAmount(''); setCategory(''); setDesc(''); onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة مصروف">
      <div className="space-y-4">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ"
          className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
        <div className="grid grid-cols-3 gap-2">
          {app.expenseCategories.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.nameAr)}
              className={`p-3 rounded-xl text-center text-xs font-medium ${category === cat.nameAr ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <span className="text-lg block">{cat.icon}</span>{cat.nameAr}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {app.wallets.map(w => (
            <button key={w.id} onClick={() => setWalletId(w.id)}
              className={`p-3 rounded-xl text-center text-sm font-medium ${walletId === w.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <span className="text-lg block">{getWalletIcon(w.type)}</span>{w.name}
            </button>
          ))}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف (اختياري)"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0 || !category}
          className="w-full bg-red-600 text-white py-4 rounded-xl font-bold disabled:opacity-50">حفظ</button>
      </div>
    </Modal>
  );
}

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
    setAmount(''); setDesc(''); onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تحويل بين المحافظ">
      <div className="space-y-4">
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ"
          className="w-full text-3xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
        <div>
          <p className="text-sm text-gray-500 mb-1">من</p>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.map(w => (
              <button key={w.id} onClick={() => { setFromId(w.id); if (toId === w.id) setToId(app.wallets.find(x => x.id !== w.id)?.id || ''); }}
                className={`p-3 rounded-xl text-center text-xs font-medium ${fromId === w.id ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>{w.name}
              </button>
            ))}
          </div>
        </div>
        <div className="text-center text-xl">⬇️</div>
        <div>
          <p className="text-sm text-gray-500 mb-1">إلى</p>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.filter(w => w.id !== fromId).map(w => (
              <button key={w.id} onClick={() => setToId(w.id)}
                className={`p-3 rounded-xl text-center text-xs font-medium ${toId === w.id ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-lg block">{getWalletIcon(w.type)}</span>{w.name}
              </button>
            ))}
          </div>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        <p className="text-xs text-gray-400 text-center">⚠️ التحويل الداخلي لن يُحسب كدخل أو مصروف</p>
        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0 || fromId === toId}
          className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold disabled:opacity-50">تنفيذ التحويل</button>
      </div>
    </Modal>
  );
}
