'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, getToday, getDaysUntil } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function ObligationsPage() {
  const app = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [reserveId, setReserveId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const activeObs = app.obligations.filter(o => o.status === 'active');
  const completedObs = app.obligations.filter(o => o.status === 'completed');

  const totalRequired = activeObs.reduce((s, o) => s + o.totalAmount, 0);
  const totalReserved = activeObs.reduce((s, o) => s + o.reservedAmount, 0);
  const remaining = totalRequired - totalReserved;

  const handleComplete = (id: string) => {
    const ob = app.obligations.find(o => o.id === id);
    if (!ob) return;
    app.updateObligation(id, { status: 'completed', reservedAmount: 0 });
    // If recurring, create next month's
    if (ob.isRecurring && ob.recurringDay) {
      const now = new Date();
      const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, ob.recurringDay);
      app.addObligation({
        name: ob.name, nameAr: ob.nameAr,
        totalAmount: ob.totalAmount, reservedAmount: 0,
        dueDate: nextDate.toISOString().split('T')[0],
        isRecurring: true, recurringDay: ob.recurringDay,
        status: 'active',
      });
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📋 الالتزامات</h1>
        <button onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 active:scale-95">
          + إضافة
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-bl from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-blue-200 text-xs mb-0.5">إجمالي الالتزامات</p>
            <p className="text-xl font-bold">{formatCurrency(totalRequired)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">تم حجزه</p>
            <p className="text-xl font-bold">{formatCurrency(totalReserved)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">باقي للحجز</p>
            <p className="text-xl font-bold">{formatCurrency(remaining)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs mb-0.5">المتاح بعد الحجز</p>
            <p className="text-xl font-bold">{formatCurrency(app.availableBalance)}</p>
          </div>
        </div>
      </div>

      {/* Active Obligations */}
      {activeObs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p>لا توجد التزامات نشطة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeObs.map(ob => {
            const days = getDaysUntil(ob.dueDate);
            const progress = ob.totalAmount > 0 ? (ob.reservedAmount / ob.totalAmount) * 100 : 0;
            const isUrgent = days <= 7 && days >= 0;
            const isOverdue = days < 0;
            const isFullyReserved = ob.reservedAmount >= ob.totalAmount;

            return (
              <div key={ob.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-colors ${
                  isOverdue ? 'border-red-300 bg-red-50' :
                  isUrgent ? 'border-amber-300 bg-amber-50' :
                  isFullyReserved ? 'border-green-300 bg-green-50' :
                  'border-gray-100'
                }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800">{ob.nameAr}</p>
                      {ob.isRecurring && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔄 شهري</span>}
                    </div>
                    <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-amber-600' : 'text-gray-500'}`}>
                      {isOverdue ? `⚠️ متأخر ${Math.abs(days)} يوم` :
                       days === 0 ? '⚠️ اليوم!' :
                       `📅 بعد ${days} يوم — ${formatDate(ob.dueDate)}`}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(ob.totalAmount)}</p>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${isFullyReserved ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">محجوز: {formatCurrency(ob.reservedAmount)}</p>
                    <p className="text-xs text-gray-500">باقي: {formatCurrency(Math.max(0, ob.totalAmount - ob.reservedAmount))}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setReserveId(ob.id)}
                    className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-100 active:scale-[0.98]">
                    🔒 حجز مبلغ
                  </button>
                  <button onClick={() => handleComplete(ob.id)}
                    className="bg-green-50 text-green-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-green-100 active:scale-[0.98]">
                    ✅
                  </button>
                  <button onClick={() => setEditId(ob.id)}
                    className="bg-gray-50 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-100 active:scale-[0.98]">
                    ✏️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completedObs.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-2">التزامات مكتملة</h3>
          <div className="space-y-2">
            {completedObs.slice(0, 5).map(ob => (
              <div key={ob.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 opacity-60">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">{ob.nameAr}</p>
                  <p className="text-sm font-medium text-gray-500 line-through">{formatCurrency(ob.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddObligationModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      {reserveId && <ReserveModal obligationId={reserveId} onClose={() => setReserveId(null)} />}
      {editId && <EditObligationModal obligationId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function AddObligationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [nameAr, setNameAr] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!nameAr || !amt || !dueDate) return;
    app.addObligation({
      name: nameAr, nameAr, totalAmount: amt, reservedAmount: 0,
      dueDate, isRecurring, recurringDay: parseInt(recurringDay) || undefined,
      status: 'active', notes,
    });
    setNameAr(''); setAmount(''); setDueDate(''); setIsRecurring(false);
    setRecurringDay(''); setNotes('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة التزام جديد">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الالتزام *</label>
          <input type="text" value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: الجمعية الشهرية"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م) *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-xl font-bold text-center" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق *</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsRecurring(!isRecurring)}
            className={`w-12 h-7 rounded-full transition-colors relative ${isRecurring ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${isRecurring ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-gray-700">التزام شهري متكرر</span>
        </div>
        {isRecurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">يوم الاستحقاق الشهري</label>
            <input type="number" min="1" max="31" value={recurringDay} onChange={e => setRecurringDay(e.target.value)} placeholder="21"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={handleSave} disabled={!nameAr || !amount || !dueDate}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98]">
          حفظ الالتزام
        </button>
      </div>
    </Modal>
  );
}

function ReserveModal({ obligationId, onClose }: { obligationId: string; onClose: () => void }) {
  const app = useApp();
  const ob = app.obligations.find(o => o.id === obligationId);
  const [amount, setAmount] = useState(ob?.reservedAmount?.toString() || '0');

  if (!ob) return null;

  const handleSave = () => {
    const amt = parseFloat(amount) || 0;
    app.reserveForObligation(obligationId, Math.min(amt, ob.totalAmount));
    onClose();
  };

  const remaining = ob.totalAmount - (parseFloat(amount) || 0);

  return (
    <Modal isOpen={true} onClose={onClose} title={`حجز مبلغ — ${ob.nameAr}`}>
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-700 mb-2">💡 هذا مبلغ محجوز فقط، لن يتم تحويله فعلياً من محفظتك</p>
          <p className="text-xs text-blue-600">يُخصم من الرصيد المتاح للإنفاق فقط</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">المبلغ المطلوب</p>
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(ob.totalAmount)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المحجوز</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            min="0" max={ob.totalAmount.toString()}
            className="w-full p-4 border border-gray-200 rounded-xl text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Quick buttons */}
        <div className="grid grid-cols-4 gap-2">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button key={pct} onClick={() => setAmount(Math.round(ob.totalAmount * pct).toString())}
              className="bg-gray-100 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200">
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Slider */}
        <input type="range" min="0" max={ob.totalAmount} value={parseFloat(amount) || 0}
          onChange={e => setAmount(e.target.value)}
          className="w-full accent-blue-500" />

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">باقي: {formatCurrency(Math.max(0, remaining))}</span>
          <span className={`font-medium ${remaining <= 0 ? 'text-green-600' : 'text-blue-600'}`}>
            {remaining <= 0 ? '✅ محجوز بالكامل' : `${Math.round(((parseFloat(amount) || 0) / ob.totalAmount) * 100)}%`}
          </span>
        </div>

        <button onClick={handleSave}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold active:scale-[0.98]">
          حفظ الحجز
        </button>
      </div>
    </Modal>
  );
}

function EditObligationModal({ obligationId, onClose }: { obligationId: string; onClose: () => void }) {
  const app = useApp();
  const ob = app.obligations.find(o => o.id === obligationId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ob) return null;

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    app.deleteObligation(obligationId);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="تفاصيل الالتزام">
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">الاسم</span>
            <span className="text-sm font-medium">{ob.nameAr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">المبلغ</span>
            <span className="text-sm font-bold">{formatCurrency(ob.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">تاريخ الاستحقاق</span>
            <span className="text-sm font-medium">{formatDate(ob.dueDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">محجوز</span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(ob.reservedAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">النوع</span>
            <span className="text-sm">{ob.isRecurring ? '🔄 شهري' : 'مرة واحدة'}</span>
          </div>
        </div>
        <button onClick={handleDelete}
          className={`w-full py-3 rounded-xl font-bold text-base transition-all ${confirmDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {confirmDelete ? 'تأكيد الحذف' : '🗑️ حذف الالتزام'}
        </button>
      </div>
    </Modal>
  );
}
