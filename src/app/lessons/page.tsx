'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, getToday, getWalletIcon, getStatusLabel, getStatusColor } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function LessonsPage() {
  const app = useApp();
  const [filterSource, setFilterSource] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [curYear, setCurYear] = useState(2026);
  const [curMonth, setCurMonth] = useState(0);

  useEffect(() => {
    const n = new Date();
    setCurYear(n.getFullYear());
    setCurMonth(n.getMonth());
  }, []);

  const filteredLessons = useMemo(() => {
    let lessons = [...app.lessons].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterSource !== 'all') {
      lessons = lessons.filter(l => l.incomeSourceId === filterSource);
    }
    return lessons;
  }, [app.lessons, filterSource]);

  const monthLessons = filteredLessons.filter(l => {
    const d = new Date(l.date);
    return d.getFullYear() === curYear && d.getMonth() === curMonth;
  });

  const completedCount = monthLessons.filter(l => l.status === 'completed').length;
  const totalEarned = monthLessons.filter(l => l.status === 'completed').reduce((s, l) => s + l.amountEarned, 0);
  const totalReceived = monthLessons.filter(l => l.status === 'completed').reduce((s, l) => s + l.amountReceived, 0);
  const outstanding = totalEarned - totalReceived;

  // Period summaries for bimonthly sources
  const bimonthlyStats = useMemo(() => {
    const sources = app.incomeSources.filter(s => s.paymentSchedule === 'bimonthly' && s.isActive);
    const today = new Date();
    const day = today.getDate();
    const periodLabel = day <= 15 ? '1 - 15' : `16 - ${new Date(curYear, curMonth + 1, 0).getDate()}`;
    return sources.map(src => {
      const srcLessons = app.lessons.filter(l => {
        const d = new Date(l.date);
        if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) return false;
        if (l.incomeSourceId !== src.id) return false;
        if (day <= 15) return d.getDate() <= 15;
        return d.getDate() > 15;
      }).filter(l => l.status === 'completed');
      return {
        source: src,
        period: periodLabel,
        count: srcLessons.length,
        earned: srcLessons.reduce((s, l) => s + l.amountEarned, 0),
        received: srcLessons.reduce((s, l) => s + l.amountReceived, 0),
      };
    });
  }, [app.lessons, app.incomeSources, curYear, curMonth]);

  // Package stats (Anas & Malek)
  const packageStats = useMemo(() => {
    const sources = app.incomeSources.filter(s => s.paymentSchedule === 'package' && s.isActive);
    return sources.map(src => {
      const allLessons = app.lessons.filter(l => l.incomeSourceId === src.id && l.status === 'completed');
      const totalCompleted = allLessons.length;
      const packageSize = src.packageLessons || 8;
      const currentPackageLessons = totalCompleted % packageSize || (totalCompleted > 0 ? packageSize : 0);
      return { source: src, totalCompleted, currentPackageLessons, packageSize, packageRate: src.packageRate || 0 };
    });
  }, [app.lessons, app.incomeSources]);

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">📚 الدروس</h1>
        <button onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 active:scale-95">
          + إضافة درس
        </button>
      </div>

      {/* Month Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">ملخص الشهر الحالي</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-gray-500">درس مكتمل</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarned)}</p>
            <p className="text-xs text-gray-500">إجمالي المستحق</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-gray-500">تم استلامه</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{formatCurrency(outstanding)}</p>
            <p className="text-xs text-gray-500">باقي لم يُستلم</p>
          </div>
        </div>
      </div>

      {/* Bimonthly Period Summaries */}
      {bimonthlyStats.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">فترات الدفع (15 و 30)</h3>
          <div className="space-y-2">
            {bimonthlyStats.map(s => (
              <div key={s.source.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.source.nameAr}</p>
                    <p className="text-xs text-gray-500">الفترة: {s.period} • {s.count} دروس</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-green-600">{formatCurrency(s.earned)}</p>
                    {s.earned > s.received && <p className="text-xs text-amber-600">باقي: {formatCurrency(s.earned - s.received)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package Stats */}
      {packageStats.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">باقات الدروس</h3>
          {packageStats.map(s => (
            <div key={s.source.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-800">{s.source.nameAr}</p>
                <p className="text-sm font-bold text-blue-600">{formatCurrency(s.packageRate)} / {s.packageSize} دروس</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${(s.currentPackageLessons / s.packageSize) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{s.currentPackageLessons} من {s.packageSize} دروس في الباقة الحالية</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button onClick={() => setFilterSource('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterSource === 'all' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          الكل
        </button>
        {app.incomeSources.filter(s => s.isActive).map(s => (
          <button key={s.id} onClick={() => setFilterSource(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterSource === s.id ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {s.nameAr}
          </button>
        ))}
      </div>

      {/* Lessons List */}
      <div className="space-y-2">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📚</p>
            <p>لا توجد دروس بعد</p>
          </div>
        ) : (
          filteredLessons.map(lesson => {
            const source = app.incomeSources.find(s => s.id === lesson.incomeSourceId);
            const outstanding = lesson.amountEarned - lesson.amountReceived;
            return (
              <div key={lesson.id} onClick={() => setEditingLesson(lesson.id)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800">{lesson.studentName || lesson.subject}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(lesson.status)}`}>
                        {getStatusLabel(lesson.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{source?.nameAr} • {formatDate(lesson.date)}</p>
                    {lesson.notes && <p className="text-xs text-gray-400 mt-1">{lesson.notes}</p>}
                  </div>
                  <div className="text-left">
                    {lesson.status === 'completed' && (
                      <>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(lesson.amountEarned)}</p>
                        {outstanding > 0 && (
                          <p className="text-xs text-amber-600">باقي: {formatCurrency(outstanding)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <AddLessonModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Edit Modal */}
      {editingLesson && (
        <EditLessonModal lessonId={editingLesson} onClose={() => setEditingLesson(null)} />
      )}
    </div>
  );
}

function AddLessonModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
    app.addLesson({
      date, studentId: '', studentName, subject,
      incomeSourceId: sourceId, status,
      amountEarned: parseFloat(earned) || 0,
      amountReceived: status === 'completed' ? (parseFloat(received) || 0) : 0,
      paymentWalletId: parseFloat(received) > 0 && status === 'completed' ? walletId : undefined,
      centerShare: parseFloat(centerShare) || 0, notes,
    });
    setStudentName(''); setSubject(''); setEarned(''); setReceived('');
    setCenterShare(''); setNotes(''); setStatus('completed'); setSourceId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل درس جديد">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">نصيب السنتر / الإيجار</label>
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
                      <span className="text-sm block">{getWalletIcon(w.type)}</span>{w.name}
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
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50"
          disabled={!sourceId || !studentName}>
          حفظ الدرس
        </button>
      </div>
    </Modal>
  );
}

function EditLessonModal({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const app = useApp();
  const lesson = app.lessons.find(l => l.id === lessonId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!lesson) return null;

  const source = app.incomeSources.find(s => s.id === lesson.incomeSourceId);

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    app.deleteLesson(lessonId);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="تفاصيل الدرس">
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">التاريخ</span>
            <span className="text-sm font-medium">{formatDate(lesson.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">الطالب</span>
            <span className="text-sm font-medium">{lesson.studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">المصدر</span>
            <span className="text-sm font-medium">{source?.nameAr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">المادة</span>
            <span className="text-sm font-medium">{lesson.subject || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">الحالة</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(lesson.status)}`}>{getStatusLabel(lesson.status)}</span>
          </div>
          {lesson.status === 'completed' && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">المستحق</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(lesson.amountEarned)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">المستلم</span>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(lesson.amountReceived)}</span>
              </div>
              {lesson.amountEarned > lesson.amountReceived && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">باقي</span>
                  <span className="text-sm font-bold text-amber-600">{formatCurrency(lesson.amountEarned - lesson.amountReceived)}</span>
                </div>
              )}
            </>
          )}
          {lesson.notes && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ملاحظات</span>
              <span className="text-sm">{lesson.notes}</span>
            </div>
          )}
        </div>
        <button onClick={handleDelete}
          className={`w-full py-3 rounded-xl font-bold text-base transition-all ${confirmDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {confirmDelete ? 'تأكيد الحذف' : '🗑️ حذف الدرس'}
        </button>
      </div>
    </Modal>
  );
}
