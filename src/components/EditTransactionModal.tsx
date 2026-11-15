'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getToday, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function EditTransactionModal({
  txnId,
  onClose,
}: {
  txnId: string | null;
  onClose: () => void;
}) {
  const app = useApp();
  const txn = app.transactions.find(t => t.id === txnId);

  const [amount, setAmount] = useState(txn ? String(txn.amount) : '');
  const [walletId, setWalletId] = useState(txn?.walletId || 'wallet_cash');
  const [targetWalletId, setTargetWalletId] = useState(txn?.targetWalletId || 'wallet_vodafone');
  const [category, setCategory] = useState(txn?.category || 'أخرى');
  const [date, setDate] = useState(txn?.date || getToday());
  const [desc, setDesc] = useState(txn?.description || '');
  const [sourceId, setSourceId] = useState(txn?.incomeSourceId || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!txn || !txnId) return null;

  const isIncome = txn.type === 'income';
  const isExpense = txn.type === 'expense';
  const isTransfer = txn.type === 'transfer';

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    const updates: Record<string, unknown> = {
      amount: amt,
      date,
      description: desc || undefined,
    };

    if (isIncome) {
      updates.walletId = walletId;
      updates.incomeSourceId = sourceId || undefined;
    } else if (isExpense) {
      updates.walletId = walletId;
      updates.category = category;
    } else if (isTransfer) {
      updates.walletId = walletId;
      updates.targetWalletId = targetWalletId;
    }

    app.updateTransaction(txnId, updates);
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    app.deleteTransaction(txnId);
    onClose();
  };

  const title = isIncome ? 'تعديل الدخل' : isExpense ? 'تعديل المصروف' : 'تعديل التحويل';

  return (
    <Modal isOpen={true} onClose={onClose} title={`✏️ ${title}`}>
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-2xl font-bold text-center p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Wallet */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{isTransfer ? 'من المحفظة' : 'المحفظة'}</label>
          <div className="grid grid-cols-3 gap-2">
            {app.wallets.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWalletId(w.id)}
                className={`p-2 rounded-xl text-center text-xs font-medium transition-colors ${
                  walletId === w.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span className="text-sm block">{getWalletIcon(w.type)}</span>
                {w.name}
              </button>
            ))}
          </div>
        </div>

        {/* Transfer: target wallet */}
        {isTransfer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى المحفظة</label>
            <div className="grid grid-cols-3 gap-2">
              {app.wallets.filter(w => w.id !== walletId).map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setTargetWalletId(w.id)}
                  className={`p-2 rounded-xl text-center text-xs font-medium transition-colors ${
                    targetWalletId === w.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-sm block">{getWalletIcon(w.type)}</span>
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expense: category */}
        {isExpense && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
            <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
              {app.expenseCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.nameAr)}
                  className={`p-2 rounded-xl text-center text-xs font-medium transition-colors ${
                    category === cat.nameAr ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-base block">{cat.icon}</span>
                  {cat.nameAr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Income: source */}
        {isIncome && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">مصدر الدخل (اختياري)</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">— اختياري —</option>
              {app.incomeSources.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.nameAr}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
          />
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98]"
        >
          حفظ التعديلات
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            confirmDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          {confirmDelete ? '⚠️ تأكيد الحذف نهائياً' : '🗑️ حذف المعاملة'}
        </button>
      </div>
    </Modal>
  );
}
