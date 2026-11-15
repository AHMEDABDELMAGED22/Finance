'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function SettingsPage() {
  const app = useApp();
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState('');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleWalletEdit = (walletId: string) => {
    const wallet = app.wallets.find(w => w.id === walletId);
    if (wallet) {
      setWalletBalance(wallet.balance.toString());
      setEditingWallet(walletId);
    }
  };

  const handleWalletSave = () => {
    if (editingWallet) {
      const bal = parseFloat(walletBalance);
      if (!isNaN(bal)) {
        app.updateWalletBalance(editingWallet, bal);
      }
      setEditingWallet(null);
    }
  };

  const handleExport = () => {
    const data = app.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `فلوسي-نسخة-احتياطية-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      if (confirm('⚠️ هل أنت متأكد؟ سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية.')) {
        const ok = app.importData(json);
        setImportStatus(ok ? '✅ تم استيراد البيانات بنجاح' : '❌ فشل استيراد البيانات');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (!showClearConfirm) { setShowClearConfirm(true); return; }
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mmm_'));
    keys.forEach(k => localStorage.removeItem(k));
    app.refreshData();
    setShowClearConfirm(false);
  };

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">⚙️ الإعدادات</h1>

      {/* Wallet Management */}
      <section>
        <h2 className="text-base font-bold text-gray-700 mb-3">💰 إدارة المحافظ</h2>
        <p className="text-xs text-gray-400 mb-3">تعديل الرصيد يدوياً لمطابقة الرصيد الفعلي</p>
        <div className="space-y-2">
          {app.wallets.map(w => (
            <div key={w.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              {editingWallet === w.id ? (
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getWalletIcon(w.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">{w.name}</p>
                    <input type="number" value={walletBalance} onChange={e => setWalletBalance(e.target.value)}
                      className="w-full p-2 border border-emerald-300 rounded-lg text-lg font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={handleWalletSave}
                      className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">✓</button>
                    <button onClick={() => setEditingWallet(null)}
                      className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium">✕</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getWalletIcon(w.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{w.name}</p>
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(w.balance)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleWalletEdit(w.id)}
                    className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
                    ✏️ تعديل
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Income Sources */}
      <section>
        <h2 className="text-base font-bold text-gray-700 mb-3">📊 مصادر الدخل</h2>
        <div className="space-y-2">
          {app.incomeSources.map(s => {
            const typeLabels: Record<string, string> = {
              center_student_pays: 'سنتر — الطالب يدفع',
              center_pays: 'سنتر — السنتر يدفع',
              self_collect: 'تحصيل ذاتي',
              online: 'أونلاين',
            };
            const scheduleLabels: Record<string, string> = {
              per_lesson: 'بالحصة',
              monthly: 'شهري',
              bimonthly: 'نصف شهري (15 و 30)',
              package: 'باقة',
              irregular: 'غير منتظم',
            };
            return (
              <div key={s.id} className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 ${!s.isActive ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.nameAr}</p>
                    <p className="text-xs text-gray-500">
                      {typeLabels[s.type] || s.type} • {scheduleLabels[s.paymentSchedule] || s.paymentSchedule}
                    </p>
                    {s.ratePerLesson && <p className="text-xs text-emerald-600">{formatCurrency(s.ratePerLesson)} / حصة</p>}
                    {s.monthlyRate && <p className="text-xs text-emerald-600">{formatCurrency(s.monthlyRate)} / شهر</p>}
                    {s.packageRate && <p className="text-xs text-emerald-600">{formatCurrency(s.packageRate)} / {s.packageLessons} حصة</p>}
                    {s.roomRental && <p className="text-xs text-red-600">إيجار: {formatCurrency(s.roomRental)} / حصة</p>}
                  </div>
                  <span className={`w-3 h-3 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Expense Categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-700">📁 تصنيفات المصاريف</h2>
          <button onClick={() => setShowCategoryModal(true)}
            className="text-sm text-emerald-600 font-medium">+ إضافة</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {app.expenseCategories.map(cat => (
            <span key={cat.id} className="bg-white px-3 py-2 rounded-xl text-sm border border-gray-100 shadow-sm">
              {cat.icon} {cat.nameAr}
            </span>
          ))}
        </div>
      </section>

      {/* Backup */}
      <section>
        <h2 className="text-base font-bold text-gray-700 mb-3">💾 النسخ الاحتياطي</h2>
        <div className="space-y-2">
          <button onClick={handleExport}
            className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-medium hover:bg-emerald-100 active:scale-[0.98] border border-emerald-200">
            📥 تصدير البيانات
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-medium hover:bg-blue-100 active:scale-[0.98] border border-blue-200">
            📤 استيراد نسخة احتياطية
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          {importStatus && (
            <p className={`text-sm text-center font-medium ${importStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {importStatus}
            </p>
          )}
        </div>
      </section>

      {/* Clear Data */}
      <section>
        <h2 className="text-base font-bold text-gray-700 mb-3">⚠️ إدارة البيانات</h2>
        <button onClick={handleClear}
          className={`w-full py-3 rounded-xl font-medium transition-all ${
            showClearConfirm ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
          {showClearConfirm ? '⚠️ تأكيد حذف جميع البيانات نهائياً' : '🗑️ مسح جميع البيانات'}
        </button>
        {showClearConfirm && (
          <button onClick={() => setShowClearConfirm(false)}
            className="w-full mt-2 py-3 rounded-xl font-medium bg-gray-100 text-gray-600">
            إلغاء
          </button>
        )}
      </section>

      {/* About */}
      <section className="text-center py-6">
        <p className="text-lg font-bold text-emerald-600">فلوسي</p>
        <p className="text-sm text-gray-400">v1.0 — إدارة الدخل والمصاريف الشخصية</p>
      </section>

      {/* Add Category Modal */}
      <AddCategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </div>
  );
}

function AddCategoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const app = useApp();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');

  const icons = ['📁', '🎮', '💊', '🏋️', '📱', '🎁', '✈️', '🏥', '📚', '🧾', '🛠️', '💡'];

  const handleSave = () => {
    if (!name) return;
    app.addExpenseCategory(name, name, icon);
    setName(''); setIcon('📁');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة تصنيف جديد">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم التصنيف</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: ترفيه"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة</label>
          <div className="grid grid-cols-6 gap-2">
            {icons.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`p-3 rounded-xl text-xl text-center transition-colors ${icon === ic ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={!name}
          className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold disabled:opacity-50">
          إضافة التصنيف
        </button>
      </div>
    </Modal>
  );
}
