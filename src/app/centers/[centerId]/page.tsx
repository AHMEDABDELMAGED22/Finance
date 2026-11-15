'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as db from '@/db/database';
import { formatCurrency, formatDate, getToday, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';
import { IncomeSource, CenterStudent, StudentSession, StudentPayment, CenterSettlement, Wallet } from '@/db/types';

type Tab = 'students' | 'reports' | 'settlements';
type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'unknown';

export default function CenterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const centerId = params.centerId as string;

  const [source, setSource] = useState<IncomeSource | null>(null);
  const [students, setStudents] = useState<CenterStudent[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [settlements, setSettlements] = useState<CenterSettlement[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('students');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [payStudentId, setPayStudentId] = useState<string | null>(null);
  const [sessionStudentId, setSessionStudentId] = useState<string | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);

  const refresh = useCallback(() => {
    setSource(db.getIncomeSources().find(s => s.id === centerId) || null);
    setStudents(db.getCenterStudents(centerId));
    setSessions(db.getStudentSessions(centerId));
    setPayments(db.getStudentPayments(centerId));
    setSettlements(db.getCenterSettlements(centerId));
    setWallets(db.getWallets());
  }, [centerId]);

  useEffect(() => { refresh(); setMounted(true); }, [refresh]);

  // Center type helpers
  const isFarouk = centerId === 'src_farouk';
  const is4Geeks = centerId === 'src_4geeks';
  const isCenterPays = centerId === 'src_manara' || centerId === 'src_roya';

  // Per-student calculations
  const studentStats = useMemo(() => {
    const stats: Record<string, {
      totalEarned: number; totalPaid: number; remaining: number;
      paidToMe: number; paidToCenter: number; sessionsCount: number;
      status: PaymentFilter;
    }> = {};
    students.forEach(st => {
      const stSessions = sessions.filter(s => s.studentId === st.id && s.status === 'completed');
      const stPayments = payments.filter(p => p.studentId === st.id);
      const earned = stSessions.reduce((s, ses) => s + ses.amountEarned, 0);
      const paidTotal = stPayments.reduce((s, p) => s + p.amount, 0);
      const paidToMe = stPayments.filter(p => p.receivedBy === 'me').reduce((s, p) => s + p.amount, 0);
      const paidToCenter = stPayments.filter(p => p.receivedBy === 'center').reduce((s, p) => s + p.amount, 0);
      const remaining = earned - paidTotal;

      let status: PaymentFilter = 'unknown';
      if (isCenterPays && stPayments.length === 0) status = 'unknown';
      else if (remaining <= 0 && earned > 0) status = 'paid';
      else if (paidTotal > 0 && remaining > 0) status = 'partial';
      else if (paidTotal === 0 && earned > 0) status = 'unpaid';

      stats[st.id] = { totalEarned: earned, totalPaid: paidTotal, remaining, paidToMe, paidToCenter, sessionsCount: stSessions.length, status };
    });
    return stats;
  }, [students, sessions, payments, isCenterPays]);

  // Center-level summaries
  const summary = useMemo(() => {
    const totalEarned = Object.values(studentStats).reduce((s, st) => s + st.totalEarned, 0);
    const totalPaid = Object.values(studentStats).reduce((s, st) => s + st.totalPaid, 0);
    const paidToMe = Object.values(studentStats).reduce((s, st) => s + st.paidToMe, 0);
    const paidToCenter = Object.values(studentStats).reduce((s, st) => s + st.paidToCenter, 0);
    const totalSettled = settlements.reduce((s, st) => s + st.amount, 0);
    const owedByCenter = isFarouk
      ? payments.filter(p => p.receivedBy === 'center').reduce((s, p) => s + (p.myShare ?? p.amount), 0) - totalSettled
      : paidToCenter - totalSettled;
    const myActualReceived = paidToMe + totalSettled;
    // 4GEEKS room rental
    const roomRentals = is4Geeks ? sessions.filter(s => s.status === 'completed').length * (source?.roomRental || 40) : 0;
    const netProfit = is4Geeks ? totalPaid - roomRentals : 0;
    return { totalEarned, totalPaid, paidToMe, paidToCenter, totalSettled, owedByCenter, myActualReceived, roomRentals, netProfit };
  }, [studentStats, settlements, payments, isFarouk, is4Geeks, sessions, source]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const active = students.filter(s => s.isActive);
    if (paymentFilter === 'all') return active;
    return active.filter(s => studentStats[s.id]?.status === paymentFilter);
  }, [students, paymentFilter, studentStats]);

  if (!mounted || !source) return null;

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/centers')} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">→</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{source.nameAr}</h1>
          <p className="text-xs text-gray-500">
            {isFarouk ? 'الطالب يدفع لي أو للسنتر' : is4Geeks ? 'تحصيل ذاتي + إيجار قاعة' : 'السنتر يجمع ويدفع لي'}
          </p>
        </div>
        <button onClick={() => setShowAddStudent(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">+ طالب</button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-bl from-indigo-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div><p className="text-indigo-200 text-[10px]">الطلبة</p><p className="text-xl font-bold">{students.filter(s => s.isActive).length}</p></div>
          <div><p className="text-indigo-200 text-[10px]">إجمالي المستحق</p><p className="text-lg font-bold">{formatCurrency(summary.totalEarned)}</p></div>
          <div><p className="text-indigo-200 text-[10px]">استلمته فعلاً</p><p className="text-lg font-bold">{formatCurrency(summary.myActualReceived)}</p></div>
          {(isFarouk || isCenterPays) && summary.owedByCenter > 0 && (
            <div><p className="text-amber-200 text-[10px]">مستحق لدى السنتر</p><p className="text-lg font-bold text-amber-200">{formatCurrency(summary.owedByCenter)}</p></div>
          )}
          {is4Geeks && (
            <>
              <div><p className="text-indigo-200 text-[10px]">إيجار القاعات</p><p className="text-lg font-bold text-red-200">{formatCurrency(summary.roomRentals)}</p></div>
              <div className="col-span-2"><p className="text-indigo-200 text-[10px]">صافي العائد</p><p className="text-2xl font-bold">{formatCurrency(summary.netProfit)}</p></div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { v: 'students' as Tab, l: '👥 الطلبة' },
          { v: 'reports' as Tab, l: '📊 التقارير' },
          ...((isFarouk || isCenterPays) ? [{ v: 'settlements' as Tab, l: '💰 التسويات' }] : []),
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === t.v ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === 'students' && (
        <>
          {/* Payment filter */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            {[
              { v: 'all' as PaymentFilter, l: 'الكل', c: 'bg-gray-500' },
              { v: 'unpaid' as PaymentFilter, l: 'لم يدفع', c: 'bg-red-500' },
              { v: 'partial' as PaymentFilter, l: 'جزئي', c: 'bg-amber-500' },
              { v: 'paid' as PaymentFilter, l: 'مدفوع', c: 'bg-green-500' },
              ...(isCenterPays ? [{ v: 'unknown' as PaymentFilter, l: 'غير معروف', c: 'bg-gray-400' }] : []),
            ].map(f => (
              <button key={f.v} onClick={() => setPaymentFilter(f.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${paymentFilter === f.v ? `${f.c} text-white` : 'bg-white text-gray-500 border border-gray-200'}`}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Student Cards */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">👥</p>
              <p>لا يوجد طلبة — اضغط "+ طالب" للإضافة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(st => {
                const stat = studentStats[st.id];
                if (!stat) return null;
                const isExpanded = expandedStudent === st.id;
                const statusBadge = stat.status === 'paid' ? { l: 'مدفوع', c: 'bg-green-100 text-green-700' }
                  : stat.status === 'partial' ? { l: 'جزئي', c: 'bg-amber-100 text-amber-700' }
                  : stat.status === 'unpaid' ? { l: 'لم يدفع', c: 'bg-red-100 text-red-700' }
                  : { l: 'غير معروف', c: 'bg-gray-100 text-gray-500' };

                return (
                  <div key={st.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-3 cursor-pointer active:bg-gray-50" onClick={() => setExpandedStudent(isExpanded ? null : st.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{st.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge.c}`}>{statusBadge.l}</span>
                          </div>
                          <p className="text-xs text-gray-400">{st.group ? `${st.group} • ` : ''}{st.subject || ''} • {stat.sessionsCount} حصة</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-800">{formatCurrency(stat.totalEarned)}</p>
                          {stat.remaining > 0 && <p className="text-xs text-red-600">باقي: {formatCurrency(stat.remaining)}</p>}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3 animate-fade-in">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white rounded-lg p-2"><p className="text-xs text-gray-500">المستحق</p><p className="text-sm font-bold text-gray-700">{formatCurrency(stat.totalEarned)}</p></div>
                          <div className="bg-white rounded-lg p-2"><p className="text-xs text-gray-500">المدفوع</p><p className="text-sm font-bold text-green-600">{formatCurrency(stat.totalPaid)}</p></div>
                          <div className="bg-white rounded-lg p-2"><p className="text-xs text-gray-500">المتبقي</p><p className="text-sm font-bold text-red-600">{formatCurrency(Math.max(0, stat.remaining))}</p></div>
                        </div>

                        {isFarouk && (
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-green-50 rounded-lg p-2"><p className="text-[10px] text-green-600">دفع لي مباشرة</p><p className="text-sm font-bold text-green-700">{formatCurrency(stat.paidToMe)}</p></div>
                            <div className="bg-amber-50 rounded-lg p-2"><p className="text-[10px] text-amber-600">دفع للسنتر</p><p className="text-sm font-bold text-amber-700">{formatCurrency(stat.paidToCenter)}</p></div>
                          </div>
                        )}

                        {/* Recent payments */}
                        {payments.filter(p => p.studentId === st.id).slice(-3).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">آخر المدفوعات</p>
                            {payments.filter(p => p.studentId === st.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-white rounded-lg p-2 mb-1 text-xs">
                                <div>
                                  <span className="text-gray-600">{formatDate(p.date)}</span>
                                  {isFarouk && <span className={`mr-2 px-1.5 py-0.5 rounded ${p.receivedBy === 'me' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {p.receivedBy === 'me' ? 'لي' : 'للسنتر'}
                                  </span>}
                                </div>
                                <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button onClick={() => setPayStudentId(st.id)} className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium active:scale-[0.98]">💵 تسجيل دفعة</button>
                          <button onClick={() => setSessionStudentId(st.id)} className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium active:scale-[0.98]">📚 حصة</button>
                          <button onClick={() => setEditStudentId(st.id)} className="bg-gray-200 text-gray-600 py-2.5 px-3 rounded-xl text-sm active:scale-[0.98]">✏️</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && <ReportsSection studentStats={studentStats} students={students} summary={summary} isFarouk={isFarouk} is4Geeks={is4Geeks} isCenterPays={isCenterPays} />}

      {/* Settlements Tab */}
      {tab === 'settlements' && (isFarouk || isCenterPays) && (
        <SettlementsSection settlements={settlements} wallets={wallets} summary={summary} onAdd={() => setShowSettlement(true)} onDelete={(id) => { db.deleteCenterSettlement(id); refresh(); }} />
      )}

      {/* Modals */}
      {showAddStudent && <AddStudentModal centerId={centerId} onClose={() => { setShowAddStudent(false); refresh(); }} isFarouk={isFarouk} />}
      {editStudentId && <EditStudentModal studentId={editStudentId} onClose={() => { setEditStudentId(null); refresh(); }} isFarouk={isFarouk} />}
      {payStudentId && <PaymentModal studentId={payStudentId} centerId={centerId} isFarouk={isFarouk} wallets={wallets} onClose={() => { setPayStudentId(null); refresh(); }} />}
      {sessionStudentId && <SessionModal studentId={sessionStudentId} centerId={centerId} source={source} onClose={() => { setSessionStudentId(null); refresh(); }} />}
      {showSettlement && <SettlementModal centerId={centerId} wallets={wallets} onClose={() => { setShowSettlement(false); refresh(); }} />}
    </div>
  );
}

// ============== Reports Section ==============
function ReportsSection({ studentStats, students, summary, isFarouk, is4Geeks, isCenterPays }: {
  studentStats: Record<string, { totalEarned: number; totalPaid: number; remaining: number; paidToMe: number; paidToCenter: number; sessionsCount: number; status: string }>;
  students: CenterStudent[]; summary: Record<string, number>; isFarouk: boolean; is4Geeks: boolean; isCenterPays: boolean;
}) {
  const active = students.filter(s => s.isActive);
  const unpaid = active.filter(s => studentStats[s.id]?.status === 'unpaid');
  const partial = active.filter(s => studentStats[s.id]?.status === 'partial');
  const paid = active.filter(s => studentStats[s.id]?.status === 'paid');

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
          <p className="text-2xl font-bold text-red-700">{unpaid.length}</p>
          <p className="text-xs text-red-600">لم يدفعوا</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
          <p className="text-2xl font-bold text-amber-700">{partial.length}</p>
          <p className="text-xs text-amber-600">دفعوا جزئياً</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
          <p className="text-2xl font-bold text-green-700">{paid.length}</p>
          <p className="text-xs text-green-600">سددوا بالكامل</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.myActualReceived as number)}</p>
          <p className="text-xs text-blue-600">استلمته فعلاً</p>
        </div>
      </div>

      {/* Financial summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <h3 className="font-bold text-gray-700 text-sm">الملخص المالي</h3>
        <div className="flex justify-between text-sm"><span className="text-gray-500">إجمالي المستحق على الطلبة</span><span className="font-bold">{formatCurrency(summary.totalEarned as number)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">إجمالي ما تم تحصيله</span><span className="font-bold text-green-600">{formatCurrency(summary.totalPaid as number)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">استلمته فعلاً</span><span className="font-bold text-blue-600">{formatCurrency(summary.myActualReceived as number)}</span></div>
        {(isFarouk || isCenterPays) && (summary.owedByCenter as number) > 0 && (
          <div className="flex justify-between text-sm"><span className="text-amber-600">مستحق لدى السنتر</span><span className="font-bold text-amber-600">{formatCurrency(summary.owedByCenter as number)}</span></div>
        )}
        {is4Geeks && (
          <>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2"><span className="text-red-600">إيجار القاعات</span><span className="font-bold text-red-600">-{formatCurrency(summary.roomRentals as number)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-700 font-bold">صافي العائد</span><span className="font-bold text-emerald-600">{formatCurrency(summary.netProfit as number)}</span></div>
          </>
        )}
      </div>

      {/* Lists */}
      {unpaid.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-red-700 mb-1">🔴 لم يدفعوا ({unpaid.length})</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {unpaid.map(s => <div key={s.id} className="flex justify-between p-3 text-sm"><span>{s.name}</span><span className="text-red-600 font-bold">{formatCurrency(studentStats[s.id]?.totalEarned || 0)}</span></div>)}
          </div>
        </div>
      )}
      {partial.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-700 mb-1">🟡 دفعوا جزئياً ({partial.length})</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {partial.map(s => <div key={s.id} className="flex justify-between p-3 text-sm"><span>{s.name}</span><span className="text-amber-600 font-bold">باقي: {formatCurrency(studentStats[s.id]?.remaining || 0)}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Settlements Section ==============
function SettlementsSection({ settlements, wallets, summary, onAdd, onDelete }: {
  settlements: CenterSettlement[]; wallets: Wallet[]; summary: Record<string, number>;
  onAdd: () => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div><p className="text-xs text-amber-700">مستحق لدى السنتر</p><p className="text-lg font-bold text-amber-800">{formatCurrency(Math.max(0, summary.owedByCenter as number))}</p></div>
          <div><p className="text-xs text-green-700">تم تسويته</p><p className="text-lg font-bold text-green-700">{formatCurrency(summary.totalSettled as number)}</p></div>
        </div>
      </div>

      <button onClick={onAdd} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium active:scale-[0.98]">+ تسجيل تسوية من السنتر</button>

      {settlements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => {
        const wallet = wallets.find(w => w.id === s.walletId);
        return (
          <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-green-600">{formatCurrency(s.amount)}</p>
              <p className="text-xs text-gray-500">{formatDate(s.date)} • {wallet?.name}</p>
              {s.notes && <p className="text-xs text-gray-400">{s.notes}</p>}
            </div>
            <button onClick={() => { if (confirm('حذف هذه التسوية؟')) onDelete(s.id); }} className="text-red-400 text-sm p-2">🗑️</button>
          </div>
        );
      })}
    </div>
  );
}

// ============== Add Student Modal ==============
function AddStudentModal({ centerId, onClose, isFarouk }: { centerId: string; onClose: () => void; isFarouk: boolean }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [billingType, setBillingType] = useState<'per_lesson' | 'monthly' | 'agreed'>('per_lesson');
  const [rate, setRate] = useState('');

  const handleSave = () => {
    if (!name) return;
    const rateNum = parseFloat(rate) || 0;
    db.addCenterStudent({
      centerId, name, group: group || undefined, subject: subject || undefined,
      billingType,
      ratePerLesson: billingType === 'per_lesson' ? rateNum : undefined,
      monthlyRate: billingType === 'monthly' ? rateNum : undefined,
      agreedAmount: billingType === 'agreed' ? rateNum : undefined,
      isActive: true,
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="إضافة طالب جديد">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة / الصف</label>
            <input type="text" value={group} onChange={e => setGroup(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الحساب</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'per_lesson' as const, l: 'بالحصة' },
              { v: 'monthly' as const, l: 'شهري' },
              { v: 'agreed' as const, l: 'مبلغ متفق' },
            ].map(b => (
              <button key={b.v} onClick={() => setBillingType(b.v)}
                className={`p-2 rounded-xl text-sm font-medium ${billingType === b.v ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{b.l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {billingType === 'per_lesson' ? 'سعر الحصة (ج.م)' : billingType === 'monthly' ? 'المبلغ الشهري (ج.م)' : 'المبلغ المتفق عليه (ج.م)'}
          </label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0"
            className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={handleSave} disabled={!name}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98]">حفظ الطالب</button>
      </div>
    </Modal>
  );
}

// ============== Edit Student Modal ==============
function EditStudentModal({ studentId, onClose, isFarouk }: { studentId: string; onClose: () => void; isFarouk: boolean }) {
  const [student, setStudent] = useState<CenterStudent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const all = db.getCenterStudents();
    setStudent(all.find(s => s.id === studentId) || null);
  }, [studentId]);

  if (!student) return null;

  const handleToggleActive = () => {
    db.updateCenterStudent(studentId, { isActive: !student.isActive });
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    db.deleteCenterStudent(studentId);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="بيانات الطالب">
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between"><span className="text-sm text-gray-500">الاسم</span><span className="text-sm font-medium">{student.name}</span></div>
          {student.group && <div className="flex justify-between"><span className="text-sm text-gray-500">المجموعة</span><span className="text-sm">{student.group}</span></div>}
          {student.subject && <div className="flex justify-between"><span className="text-sm text-gray-500">المادة</span><span className="text-sm">{student.subject}</span></div>}
          <div className="flex justify-between"><span className="text-sm text-gray-500">الحساب</span><span className="text-sm">{student.billingType === 'per_lesson' ? `${formatCurrency(student.ratePerLesson || 0)} / حصة` : student.billingType === 'monthly' ? `${formatCurrency(student.monthlyRate || 0)} / شهر` : formatCurrency(student.agreedAmount || 0)}</span></div>
          <div className="flex justify-between"><span className="text-sm text-gray-500">الحالة</span><span className={`text-xs px-2 py-0.5 rounded-full ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.isActive ? 'نشط' : 'متوقف'}</span></div>
        </div>
        <button onClick={handleToggleActive}
          className={`w-full py-3 rounded-xl font-medium ${student.isActive ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {student.isActive ? '⏸️ إيقاف الطالب' : '▶️ إعادة تفعيل'}
        </button>
        <button onClick={handleDelete}
          className={`w-full py-3 rounded-xl font-bold ${confirmDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {confirmDelete ? 'تأكيد الحذف نهائياً' : '🗑️ حذف الطالب'}
        </button>
      </div>
    </Modal>
  );
}

// ============== Payment Modal ==============
function PaymentModal({ studentId, centerId, isFarouk, wallets, onClose }: {
  studentId: string; centerId: string; isFarouk: boolean; wallets: Wallet[]; onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'vodafone_cash' | 'instapay'>('cash');
  const [receivedBy, setReceivedBy] = useState<'me' | 'center'>('me');
  const [walletId, setWalletId] = useState('wallet_cash');
  const [date, setDate] = useState(getToday());
  const [myShare, setMyShare] = useState('');
  const [centerShareVal, setCenterShareVal] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-sync wallet with payment method
  useEffect(() => {
    if (method === 'cash') setWalletId('wallet_cash');
    else if (method === 'vodafone_cash') setWalletId('wallet_vodafone');
    else setWalletId('wallet_instapay');
  }, [method]);

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const myShareNum = isFarouk ? (parseFloat(myShare) || amt) : undefined;
    const centerShareNum = isFarouk ? (parseFloat(centerShareVal) || 0) : undefined;

    db.addStudentPayment({
      studentId, centerId, date, amount: amt,
      paymentMethod: method,
      receivedBy: isFarouk ? receivedBy : (centerId === 'src_4geeks' ? 'me' : 'center'),
      walletId: (isFarouk ? receivedBy === 'me' : centerId === 'src_4geeks') ? walletId : undefined,
      myShare: myShareNum, centerShare: centerShareNum,
      notes: notes || undefined,
    });
    onClose();
  };

  const student = db.getCenterStudents().find(s => s.id === studentId);
  const isCenterPays = centerId === 'src_manara' || centerId === 'src_roya';

  return (
    <Modal isOpen={true} onClose={onClose} title={`💵 دفعة — ${student?.name || ''}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full p-4 border border-gray-200 rounded-xl text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-green-500" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'cash' as const, l: 'نقدي', icon: '💵' },
              { v: 'vodafone_cash' as const, l: 'فودافون كاش', icon: '📱' },
              { v: 'instapay' as const, l: 'إنستاباي', icon: '🏦' },
            ].map(m => (
              <button key={m.v} onClick={() => setMethod(m.v)}
                className={`p-2 rounded-xl text-center text-xs font-medium ${method === m.v ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-sm block">{m.icon}</span>{m.l}
              </button>
            ))}
          </div>
        </div>

        {isFarouk && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مَن استلم الفلوس؟</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setReceivedBy('me')}
                  className={`p-3 rounded-xl text-sm font-medium ${receivedBy === 'me' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  🙋 أنا
                </button>
                <button onClick={() => setReceivedBy('center')}
                  className={`p-3 rounded-xl text-sm font-medium ${receivedBy === 'center' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  🏫 السنتر
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نصيبي</label>
                <input type="number" value={myShare} onChange={e => setMyShare(e.target.value)} placeholder={amount || '0'}
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نصيب السنتر</label>
                <input type="number" value={centerShareVal} onChange={e => setCenterShareVal(e.target.value)} placeholder="0"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>

            {receivedBy === 'center' && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                ⚠️ هذا المبلغ لن يُضاف لمحفظتك — سيظهر كمستحق لدى السنتر حتى تتم التسوية
              </p>
            )}
          </>
        )}

        {isCenterPays && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
            ℹ️ هذه الدفعة استلمها السنتر — ستظهر في كشف التسويات
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98]">
          حفظ الدفعة
        </button>
      </div>
    </Modal>
  );
}

// ============== Session Modal ==============
function SessionModal({ studentId, centerId, source, onClose }: {
  studentId: string; centerId: string; source: IncomeSource; onClose: () => void;
}) {
  const [date, setDate] = useState(getToday());
  const [status, setStatus] = useState<'completed' | 'cancelled' | 'postponed'>('completed');
  const [earned, setEarned] = useState('');
  const [notes, setNotes] = useState('');

  const student = db.getCenterStudents().find(s => s.id === studentId);

  // Pre-fill rate
  useEffect(() => {
    if (student?.ratePerLesson) setEarned(student.ratePerLesson.toString());
  }, [student]);

  const handleSave = () => {
    db.addStudentSession({
      studentId, centerId, date, status,
      amountEarned: status === 'completed' ? (parseFloat(earned) || 0) : 0,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`📚 حصة — ${student?.name || ''}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'completed' as const, l: 'حضر', c: 'bg-green-500' },
              { v: 'cancelled' as const, l: 'غائب', c: 'bg-red-500' },
              { v: 'postponed' as const, l: 'مؤجل', c: 'bg-yellow-500' },
            ].map(s => (
              <button key={s.v} onClick={() => setStatus(s.v)}
                className={`p-2 rounded-xl text-sm font-medium ${status === s.v ? `${s.c} text-white` : 'bg-gray-100 text-gray-600'}`}>{s.l}</button>
            ))}
          </div>
        </div>
        {status === 'completed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستحق (ج.م)</label>
            <input type="number" value={earned} onChange={e => setEarned(e.target.value)} placeholder="0"
              className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>
        <button onClick={handleSave}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold active:scale-[0.98]">حفظ</button>
      </div>
    </Modal>
  );
}

// ============== Settlement Modal ==============
function SettlementModal({ centerId, wallets, onClose }: { centerId: string; wallets: Wallet[]; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('wallet_cash');
  const [date, setDate] = useState(getToday());
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    db.addCenterSettlement({ centerId, date, amount: amt, walletId, notes: notes || undefined });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="💰 تسجيل تسوية من السنتر">
      <div className="space-y-4">
        <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-xl">هذا المبلغ الذي سلّمه لك السنتر من الأموال التي جمعها من الطلبة</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full p-4 border border-gray-200 rounded-xl text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-green-500" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">استلمته في</label>
          <div className="grid grid-cols-3 gap-2">
            {wallets.map(w => (
              <button key={w.id} onClick={() => setWalletId(w.id)}
                className={`p-2 rounded-xl text-center text-xs font-medium ${walletId === w.id ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-sm block">{getWalletIcon(w.type)}</span>{w.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>
        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98]">
          تسجيل التسوية
        </button>
      </div>
    </Modal>
  );
}
