'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as db from '@/db/database';
import { formatCurrency, formatDate, getToday, getWalletIcon } from '@/lib/utils';
import Modal from '@/components/Modal';
import { useApp } from '@/contexts/AppContext';
import { IncomeSource, CenterStudent, StudentSession, StudentPayment, CenterSettlement, CenterGroupSession, Wallet, Transaction } from '@/db/types';

type Tab = 'students' | 'sessions' | 'reports' | 'settlements' | 'rentals';
type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'unknown';

const FAROUK_GROUPS = [
  'تانية بكالوريا عربي',
  'تانية بكالوريا لغات',
  'أولى ثانوي لغات',
] as const;

export default function CenterDetailPage() {
  const app = useApp();
  const params = useParams();
  const router = useRouter();
  const centerId = params.centerId as string;

  const [source, setSource] = useState<IncomeSource | null>(null);
  const [students, setStudents] = useState<CenterStudent[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [settlements, setSettlements] = useState<CenterSettlement[]>([]);
  const [groupSessions, setGroupSessions] = useState<CenterGroupSession[]>([]);
  const [rentals, setRentals] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('students');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  // Modals
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [payStudentId, setPayStudentId] = useState<string | null>(null);
  const [sessionStudentId, setSessionStudentId] = useState<string | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showPayRental, setShowPayRental] = useState(false);
  const [showAddGroupSession, setShowAddGroupSession] = useState(false);

  // Center type helpers
  const isFarouk = centerId === 'src_farouk';
  const is4Geeks = centerId === 'src_4geeks';
  const isCenterPays = centerId === 'src_manara' || centerId === 'src_roya';

  const refresh = useCallback(() => {
    setSource(db.getIncomeSources().find(s => s.id === centerId) || null);
    setStudents(db.getCenterStudents(centerId));
    setSessions(db.getStudentSessions(centerId));
    setPayments(db.getStudentPayments(centerId));
    setSettlements(db.getCenterSettlements(centerId));
    setGroupSessions(db.getCenterGroupSessions(centerId));
    setWallets(db.getWallets());
    if (centerId === 'src_4geeks') {
      setRentals(db.getCenterExpenses('src_4geeks'));
    }
  }, [centerId]);

  const handleMutation = useCallback(() => {
    refresh();
    app.refreshData();
  }, [refresh, app]);

  useEffect(() => {
    refresh();
    setMounted(true);
  }, [refresh]);

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
      const earnedFromSessions = stSessions.reduce((s, ses) => s + ses.amountEarned, 0);
      const earned = earnedFromSessions > 0 ? earnedFromSessions : (st.agreedAmount || 0);
      const paidTotal = stPayments.reduce((s, p) => s + p.amount, 0);
      const paidToMe = stPayments.filter(p => p.receivedBy === 'me').reduce((s, p) => s + p.amount, 0);
      const paidToCenter = stPayments.filter(p => p.receivedBy === 'center').reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, earned - paidTotal);

      let status: PaymentFilter = 'unpaid';
      if (isCenterPays && stPayments.length === 0 && stSessions.length === 0) {
        status = 'unknown';
      } else if (paidTotal > 0) {
        if (earned > 0) {
          if (paidTotal >= earned) {
            status = 'paid';
          } else {
            status = 'partial';
          }
        } else {
          // If student has made payments but earned is 0, they have paid!
          status = 'paid';
        }
      } else {
        // paidTotal === 0
        if (isCenterPays) {
          status = 'unknown';
        } else {
          status = 'unpaid';
        }
      }

      stats[st.id] = { totalEarned: earned, totalPaid: paidTotal, remaining, paidToMe, paidToCenter, sessionsCount: stSessions.length, status };
    });
    return stats;
  }, [students, sessions, payments, isCenterPays]);

  // Counts of students by payment status for the filter pills
  const statusCounts = useMemo(() => {
    let active = students.filter(s => s.isActive);
    if (isFarouk && selectedGroup !== 'all') {
      if (selectedGroup === 'أخرى') {
        active = active.filter(s => !(FAROUK_GROUPS as readonly string[]).includes(s.group || ''));
      } else {
        active = active.filter(s => s.group === selectedGroup);
      }
    }
    const counts = { all: active.length, paid: 0, partial: 0, unpaid: 0, unknown: 0 };
    active.forEach(st => {
      const stStat = studentStats[st.id];
      if (stStat) {
        counts[stStat.status] = (counts[stStat.status] || 0) + 1;
      }
    });
    return counts;
  }, [students, isFarouk, selectedGroup, studentStats]);

  // Center-level summaries
  const summary = useMemo(() => {
    const totalEarned = Object.values(studentStats).reduce((s, st) => s + st.totalEarned, 0);
    const totalPaid = Object.values(studentStats).reduce((s, st) => s + st.totalPaid, 0);
    const paidToMe = Object.values(studentStats).reduce((s, st) => s + st.paidToMe, 0);
    const paidToCenter = Object.values(studentStats).reduce((s, st) => s + st.paidToCenter, 0);
    const totalSettled = settlements.reduce((s, st) => s + st.amount, 0);
    const owedByCenter = isFarouk
      ? payments.filter(p => p.receivedBy === 'center').reduce((s, p) => s + (p.myShare ?? p.amount), 0) - totalSettled
      : (isCenterPays ? totalEarned - totalSettled : paidToCenter - totalSettled);
    const myActualReceived = isCenterPays ? totalSettled : (paidToMe + totalSettled);

    // 4GEEKS room rentals
    const totalSessions = sessions.filter(s => s.status === 'completed').length;
    const roomRentalRate = source?.roomRental || 40;
    const roomRentalDue = totalSessions * roomRentalRate;
    const roomRentalPaid = rentals.reduce((s, r) => s + r.amount, 0);
    const roomRentalRemaining = Math.max(0, roomRentalDue - roomRentalPaid);
    const netProfit = totalPaid - roomRentalPaid;

    return {
      totalEarned, totalPaid, paidToMe, paidToCenter, totalSettled, owedByCenter,
      myActualReceived, roomRentalDue, roomRentalPaid, roomRentalRemaining, netProfit, totalSessions
    };
  }, [studentStats, settlements, payments, rentals, isFarouk, is4Geeks, isCenterPays, sessions, source]);

  // Group-level stats for Al Farouk
  const faroukGroupStats = useMemo(() => {
    if (!isFarouk) return {};
    const groupMap: Record<string, { count: number; earned: number; paid: number; remaining: number }> = {};
    FAROUK_GROUPS.forEach(g => {
      groupMap[g] = { count: 0, earned: 0, paid: 0, remaining: 0 };
    });
    groupMap['أخرى'] = { count: 0, earned: 0, paid: 0, remaining: 0 };

    students.filter(s => s.isActive).forEach(st => {
      const g = (FAROUK_GROUPS as readonly string[]).includes(st.group || '') ? (st.group as string) : 'أخرى';
      const stStat = studentStats[st.id];
      if (stStat) {
        groupMap[g].count += 1;
        groupMap[g].earned += stStat.totalEarned;
        groupMap[g].paid += stStat.totalPaid;
        groupMap[g].remaining += Math.max(0, stStat.remaining);
      }
    });
    return groupMap;
  }, [isFarouk, students, studentStats]);

  // Filter students (Group + Payment Status)
  const filteredStudents = useMemo(() => {
    let active = students.filter(s => s.isActive);
    if (isFarouk && selectedGroup !== 'all') {
      if (selectedGroup === 'أخرى') {
        active = active.filter(s => !(FAROUK_GROUPS as readonly string[]).includes(s.group || ''));
      } else {
        active = active.filter(s => s.group === selectedGroup);
      }
    }
    if (paymentFilter === 'all') return active;
    return active.filter(s => studentStats[s.id]?.status === paymentFilter);
  }, [students, isFarouk, selectedGroup, paymentFilter, studentStats]);

  if (!mounted || !source) return null;

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/centers')} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
          →
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">{source.nameAr}</h1>
            {isFarouk && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">3 مجموعات</span>}
            {is4Geeks && <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">إيجار قاعة {source.roomRental || 40} ج.م</span>}
          </div>
          <p className="text-xs text-gray-500">
            {isFarouk ? 'الطالب يدفع لي أو للسنتر — تسوية مباشرة' : is4Geeks ? 'تحصيل ذاتي — خصم إيجار القاعة' : 'السنتر يجمع الحسابات وأستلم منه مباشرة'}
          </p>
        </div>
        <button onClick={() => setShowAddStudent(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95 shadow-sm">
          + طالب
        </button>
      </div>

      {/* Main Center Summary Card */}
      <div className={`rounded-2xl p-4 text-white shadow-lg ${
        isFarouk ? 'bg-gradient-to-bl from-blue-700 via-indigo-700 to-indigo-800' :
        is4Geeks ? 'bg-gradient-to-bl from-purple-700 via-indigo-700 to-slate-800' :
        'bg-gradient-to-bl from-teal-700 via-emerald-700 to-emerald-800'
      }`}>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-white/70 text-[10px]">الطلبة النشطين</p>
            <p className="text-xl font-bold">{students.filter(s => s.isActive).length}</p>
          </div>
          <div>
            <p className="text-white/70 text-[10px]">{isCenterPays ? 'إجمالي حصص الطلبة' : 'إجمالي المستحق'}</p>
            <p className="text-lg font-bold">{formatCurrency(summary.totalEarned)}</p>
          </div>
          <div>
            <p className="text-white/70 text-[10px]">استلمته فعلاً في محفظتي</p>
            <p className="text-lg font-bold text-green-300">{formatCurrency(summary.myActualReceived)}</p>
          </div>

          {(isFarouk || isCenterPays) && (
            <div>
              <p className="text-amber-200 text-[10px]">مستحق طرف السنتر</p>
              <p className="text-lg font-bold text-amber-300">{formatCurrency(Math.max(0, summary.owedByCenter))}</p>
            </div>
          )}

          {is4Geeks && (
            <>
              <div>
                <p className="text-purple-200 text-[10px]">إيجار القاعات المخصوم</p>
                <p className="text-lg font-bold text-red-300">-{formatCurrency(summary.roomRentalPaid)}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-white/10">
                <p className="text-white/80 text-xs">صافي دخل 4GEEKS بعد خصم الإيجار</p>
                <p className="text-2xl font-bold text-emerald-300">{formatCurrency(summary.netProfit)}</p>
                {summary.roomRentalRemaining > 0 && (
                  <p className="text-[11px] text-amber-200 mt-0.5">⚠️ متبقي إيجار قاعات لم يُخصم: {formatCurrency(summary.roomRentalRemaining)}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Prominent Quick Actions for Roya / Manara / 4GEEKS */}
      {isCenterPays && (
        <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-emerald-800 font-bold">تسوية دفعات السنتر المباشرة</p>
            <p className="text-[11px] text-emerald-600">مستحق لك طرف {source.nameAr}: <span className="font-bold">{formatCurrency(Math.max(0, summary.owedByCenter))}</span></p>
          </div>
          <button
            onClick={() => setShowSettlement(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold active:scale-95 shadow"
          >
            💰 استلام دفعة من السنتر
          </button>
        </div>
      )}

      {is4Geeks && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-purple-200">متابعة حصص 4GEEKS</p>
              <h3 className="text-lg font-black text-white">
                {groupSessions.length > 0 ? `احنا في الحصة رقم #${groupSessions[0].sessionNumber}` : 'لم تبدأ الحصص بعد'}
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddGroupSession(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold active:scale-95 shadow transition-all flex items-center gap-1"
              >
                <span>➕</span> تسجيل حصة
              </button>
              <button
                onClick={() => setShowPayRental(true)}
                className="bg-purple-800/80 hover:bg-purple-700 text-purple-100 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 border border-purple-500/40"
              >
                🏠 خصم إيجار
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-purple-700/60">
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[10px] text-purple-200">أخذنا كام حصة؟</p>
              <p className="text-base font-extrabold text-white">{groupSessions.length} حصص</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[10px] text-purple-200">الحصة القادمة</p>
              <p className="text-base font-extrabold text-amber-300">
                رقم #{groupSessions.length > 0 ? (Math.max(...groupSessions.map(s => s.sessionNumber)) + 1) : 1}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[10px] text-purple-200">آخر حصة مسجلة</p>
              <p className="text-xs font-bold text-white truncate mt-1">
                {groupSessions.length > 0 ? formatDate(groupSessions[0].date) : 'لا يوجد'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-purple-200 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <span>إيجار القاعة (40 ج/حصة): مخصوم <strong className="text-emerald-300">{formatCurrency(summary.roomRentalPaid)}</strong></span>
            {summary.roomRentalRemaining > 0 && (
              <span className="text-amber-300 font-bold">متبقي: {formatCurrency(summary.roomRentalRemaining)}</span>
            )}
          </div>
        </div>
      )}

      {/* Al Farouk 3-Group Overview Card */}
      {isFarouk && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-700">تقسيمة مجموعات سنتر الفاروق</h2>
            <span className="text-[10px] text-gray-400">اختر مجموعة للفلترة السريعة</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FAROUK_GROUPS.map((grpName, idx) => {
              const gStat = faroukGroupStats[grpName];
              const isSelected = selectedGroup === grpName;
              const badgeColors = [
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', active: 'bg-blue-600 text-white' },
                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', active: 'bg-purple-600 text-white' },
                { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', active: 'bg-emerald-600 text-white' },
              ][idx];

              return (
                <button
                  key={grpName}
                  onClick={() => setSelectedGroup(isSelected ? 'all' : grpName)}
                  className={`p-2.5 rounded-xl text-right transition-all border text-xs ${
                    isSelected ? `${badgeColors.active} shadow-md border-transparent` : `${badgeColors.bg} ${badgeColors.border} ${badgeColors.text}`
                  }`}
                >
                  <p className="font-bold leading-tight truncate">{grpName}</p>
                  <p className="text-[10px] mt-1 opacity-80">{gStat?.count || 0} طالب</p>
                  <p className="font-bold text-[11px] mt-0.5">{formatCurrency(gStat?.earned || 0)}</p>
                  {gStat && gStat.remaining > 0 && (
                    <p className="text-[10px] text-red-500 font-medium">باقي: {formatCurrency(gStat.remaining)}</p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedGroup !== 'all' && (
            <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-gray-700">فلترة المجموعة الحالية: <strong>{selectedGroup}</strong></span>
              <button onClick={() => setSelectedGroup('all')} className="text-blue-600 font-bold hover:underline">عرض الكل</button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {[
          { v: 'students' as Tab, l: `👥 الطلبة (${students.filter(s => s.isActive).length})` },
          ...(is4Geeks ? [{ v: 'sessions' as Tab, l: `📅 سجل الحصص (${groupSessions.length})` }] : []),
          ...((isFarouk || isCenterPays) ? [{ v: 'settlements' as Tab, l: '💰 تسويات السنتر' }] : []),
          ...(is4Geeks ? [{ v: 'rentals' as Tab, l: '🏠 إيجار القاعات' }] : []),
          { v: 'reports' as Tab, l: '📊 التقارير' },
        ].map(t => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              tab === t.v ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="space-y-3">
          {/* Payment Status Filter with Live Counts */}
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { v: 'all' as PaymentFilter, l: `الكل (${statusCounts.all})` },
              { v: 'paid' as PaymentFilter, l: `مدفوع بالكامل 🟢 (${statusCounts.paid})` },
              { v: 'partial' as PaymentFilter, l: `دفع جزئي 🟡 (${statusCounts.partial})` },
              { v: 'unpaid' as PaymentFilter, l: `لم يدفع 🔴 (${statusCounts.unpaid})` },
              ...(isCenterPays ? [{ v: 'unknown' as PaymentFilter, l: `غير معروف ⚪ (${statusCounts.unknown})` }] : []),
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setPaymentFilter(f.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  paymentFilter === f.v ? 'bg-gray-800 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
              <p className="text-4xl mb-2">👥</p>
              <p className="font-medium text-sm">لا يوجد طلبة مطابقين للفلتر</p>
              <button onClick={() => setShowAddStudent(true)} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
                + إضافة طالب جديد
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(st => {
                const stat = studentStats[st.id];
                if (!stat) return null;
                const isExpanded = expandedStudent === st.id;
                const statusBadge = stat.status === 'paid' ? { l: 'مدفوع بالكامل 🟢', c: 'bg-green-100 text-green-700' }
                  : stat.status === 'partial' ? { l: 'دفع جزئي 🟡', c: 'bg-amber-100 text-amber-700' }
                  : stat.status === 'unpaid' ? { l: 'لم يدفع 🔴', c: 'bg-red-100 text-red-700' }
                  : { l: 'غير معروف ⚪', c: 'bg-gray-100 text-gray-500' };

                return (
                  <div key={st.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                    <div
                      className="p-3 cursor-pointer active:bg-gray-50 flex items-center justify-between"
                      onClick={() => setExpandedStudent(isExpanded ? null : st.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 text-sm">{st.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge.c}`}>{statusBadge.l}</span>
                          {st.group && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              st.group === 'تانية بكالوريا عربي' ? 'bg-blue-100 text-blue-800' :
                              st.group === 'تانية بكالوريا لغات' ? 'bg-purple-100 text-purple-800' :
                              st.group === 'أولى ثانوي لغات' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {st.group}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {st.subject ? `${st.subject} • ` : ''}
                          {stat.sessionsCount} حصص
                          {st.ratePerLesson ? ` • ${formatCurrency(st.ratePerLesson)}/حصة` : ''}
                        </p>
                      </div>

                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-800">
                          {stat.totalEarned > 0 ? formatCurrency(stat.totalEarned) : (stat.totalPaid > 0 ? formatCurrency(stat.totalPaid) : '0 ج.م')}
                        </p>
                        {stat.remaining > 0 ? (
                          <p className="text-xs font-bold text-red-600">باقي: {formatCurrency(stat.remaining)}</p>
                        ) : stat.totalPaid > 0 ? (
                          <p className="text-[11px] font-bold text-green-600">مسدد بالكامل</p>
                        ) : (
                          <p className="text-[11px] text-gray-400">لا مستحقات</p>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3 animate-fade-in">
                        {/* Student Breakdown Cards */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white rounded-lg p-2 border border-gray-100">
                            <p className="text-[10px] text-gray-400">إجمالي المستحق</p>
                            <p className="text-sm font-bold text-gray-700">{formatCurrency(stat.totalEarned)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100">
                            <p className="text-[10px] text-gray-400">المدفوع</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(stat.totalPaid)}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-gray-100">
                            <p className="text-[10px] text-gray-400">المتبقي</p>
                            <p className="text-sm font-bold text-red-600">{formatCurrency(Math.max(0, stat.remaining))}</p>
                          </div>
                        </div>

                        {isFarouk && (
                          <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                              <p className="text-green-700 font-medium text-[10px]">دفع لي مباشرة</p>
                              <p className="text-sm font-bold text-green-800">{formatCurrency(stat.paidToMe)}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                              <p className="text-amber-700 font-medium text-[10px]">دفع للسنتر (مستحق لي)</p>
                              <p className="text-sm font-bold text-amber-800">{formatCurrency(stat.paidToCenter)}</p>
                            </div>
                          </div>
                        )}

                        {/* Recent Payments List */}
                        {payments.filter(p => p.studentId === st.id).length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-gray-600 mb-1">سجل مدفوعات الطالب</p>
                            <div className="space-y-1">
                              {payments
                                .filter(p => p.studentId === st.id)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(p => (
                                  <div key={p.id} className="flex justify-between items-center bg-white rounded-lg p-2 text-xs border border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                      <span>{getWalletIcon(p.paymentMethod)}</span>
                                      <span className="text-gray-600">{formatDate(p.date)}</span>
                                      {isFarouk && (
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                          p.receivedBy === 'me' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {p.receivedBy === 'me' ? 'استلمته أنا' : 'استلمه السنتر'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-left">
                                      <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                                      {p.notes && <p className="text-[10px] text-gray-400">{p.notes}</p>}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Quick Action Buttons for Student */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setPayStudentId(st.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.98] shadow-sm flex items-center justify-center gap-1"
                          >
                            <span>💵</span> تسجيل دفعة
                          </button>
                          <button
                            onClick={() => setSessionStudentId(st.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.98] shadow-sm flex items-center justify-center gap-1"
                          >
                            <span>📚</span> تسجيل حضور
                          </button>
                          <button
                            onClick={() => setEditStudentId(st.id)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 px-3 rounded-xl text-xs font-bold active:scale-[0.98]"
                          >
                            ✏️ تعديل
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab (Farouk / Manara / Roya) */}
      {tab === 'settlements' && (isFarouk || isCenterPays) && (
        <SettlementsSection
          sourceName={source.nameAr}
          settlements={settlements}
          wallets={wallets}
          summary={summary}
          onAdd={() => setShowSettlement(true)}
          onDelete={(id) => { db.deleteCenterSettlement(id); handleMutation(); }}
        />
      )}

      {/* Rentals Tab (4GEEKS only) */}
      {tab === 'rentals' && is4Geeks && (
        <RentalsSection
          rentals={rentals}
          wallets={wallets}
          summary={summary}
          onAdd={() => setShowPayRental(true)}
          onDelete={(id) => { db.deleteTransaction(id); handleMutation(); }}
        />
      )}

      {/* Group Sessions Tab (4GEEKS & classes) */}
      {tab === 'sessions' && (
        <GroupSessionsSection
          sessions={groupSessions}
          students={students}
          onAdd={() => setShowAddGroupSession(true)}
          onDelete={(id) => { db.deleteCenterGroupSession(id); handleMutation(); }}
        />
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <ReportsSection
          studentStats={studentStats}
          students={students}
          summary={summary}
          isFarouk={isFarouk}
          is4Geeks={is4Geeks}
          isCenterPays={isCenterPays}
          faroukGroups={isFarouk ? faroukGroupStats : undefined}
        />
      )}

      {/* Modals */}
      {showAddStudent && <AddStudentModal centerId={centerId} onClose={() => { setShowAddStudent(false); handleMutation(); }} isFarouk={isFarouk} />}
      {editStudentId && <EditStudentModal studentId={editStudentId} onClose={() => { setEditStudentId(null); handleMutation(); }} isFarouk={isFarouk} />}
      {payStudentId && <PaymentModal studentId={payStudentId} centerId={centerId} isFarouk={isFarouk} wallets={wallets} onClose={() => { setPayStudentId(null); handleMutation(); }} />}
      {sessionStudentId && <SessionModal studentId={sessionStudentId} centerId={centerId} source={source} onClose={() => { setSessionStudentId(null); handleMutation(); }} />}
      {showSettlement && <SettlementModal centerId={centerId} sourceName={source.nameAr} wallets={wallets} onClose={() => { setShowSettlement(false); handleMutation(); }} />}
      {showPayRental && <PayRentalModal source={source} wallets={wallets} onClose={() => { setShowPayRental(false); handleMutation(); }} />}
      {showAddGroupSession && (
        <AddGroupSessionModal
          centerId={centerId}
          students={students.filter(s => s.isActive)}
          existingSessions={groupSessions}
          source={source}
          wallets={wallets}
          onClose={() => { setShowAddGroupSession(false); handleMutation(); }}
        />
      )}
    </div>
  );
}

// ============== Settlements Section (Manara, Roya, Farouk) ==============
function SettlementsSection({ sourceName, settlements, wallets, summary, onAdd, onDelete }: {
  sourceName: string; settlements: CenterSettlement[]; wallets: Wallet[]; summary: Record<string, number>;
  onAdd: () => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-sm">
        <p className="text-xs text-amber-800 font-bold mb-2">حساب التسويات مع {sourceName}</p>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-amber-100">
            <p className="text-[10px] text-amber-700">مستحق لك طرف السنتر</p>
            <p className="text-lg font-bold text-amber-800">{formatCurrency(Math.max(0, summary.owedByCenter as number))}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-100">
            <p className="text-[10px] text-green-700">تم تسليمه لك بالفعل</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(summary.totalSettled as number)}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] shadow flex items-center justify-center gap-2"
      >
        <span>💰</span> تسجيل دفعة مستلمة من السنتر
      </button>

      <div>
        <h3 className="text-xs font-bold text-gray-700 mb-2">سجل التسويات السابقة</h3>
        {settlements.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
            لم تسجل أي تسويات من السنتر بعد
          </div>
        ) : (
          <div className="space-y-2">
            {settlements
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(s => {
                const wallet = wallets.find(w => w.id === s.walletId);
                return (
                  <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(s.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(s.date)} • مستلم في: <strong>{wallet?.name}</strong></p>
                      {s.notes && <p className="text-[10px] text-gray-400 mt-0.5">{s.notes}</p>}
                    </div>
                    <button onClick={() => { if (confirm('هل تريد حذف هذه التسوية وتحديث رصيد المحفظة؟')) onDelete(s.id); }} className="text-red-400 hover:text-red-600 text-sm p-2">
                      🗑️
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============== Rentals Section (4GEEKS) ==============
function RentalsSection({ rentals, wallets, summary, onAdd, onDelete }: {
  rentals: Transaction[]; wallets: Wallet[]; summary: Record<string, number>;
  onAdd: () => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 shadow-sm">
        <p className="text-xs text-purple-900 font-bold mb-2">متابعة إيجار قاعة 4GEEKS</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-purple-100">
            <p className="text-[10px] text-gray-400">إجمالي الحصص</p>
            <p className="text-base font-bold text-gray-700">{summary.totalSessions as number} حصة</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-100">
            <p className="text-[10px] text-gray-400">إيجار مخصوم</p>
            <p className="text-base font-bold text-green-700">{formatCurrency(summary.roomRentalPaid as number)}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-100">
            <p className="text-[10px] text-gray-400">متبقي خصمه</p>
            <p className="text-base font-bold text-red-600">{formatCurrency(summary.roomRentalRemaining as number)}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] shadow flex items-center justify-center gap-2"
      >
        <span>🏠</span> خصم ودفع إيجار القاعة
      </button>

      <div>
        <h3 className="text-xs font-bold text-gray-700 mb-2">سجل مدفوعات إيجار القاعة</h3>
        {rentals.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
            لم تسجل أي مدفوعات إيجار قاعة حتى الآن
          </div>
        ) : (
          <div className="space-y-2">
            {rentals
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(r => {
                const wallet = wallets.find(w => w.id === r.walletId);
                return (
                  <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-red-600">-{formatCurrency(r.amount)}</p>
                      <p className="text-xs text-gray-500">{formatDate(r.date)} • مدفوع من: <strong>{wallet?.name}</strong></p>
                      {r.description && <p className="text-[10px] text-gray-400">{r.description}</p>}
                    </div>
                    <button onClick={() => { if (confirm('هل تريد حذف هذا المصروف وإعادة المبلغ للمحفظة؟')) onDelete(r.id); }} className="text-red-400 hover:text-red-600 text-sm p-2">
                      🗑️
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============== Pay Rental Modal (4GEEKS) ==============
function PayRentalModal({ source, wallets, onClose }: {
  source: IncomeSource; wallets: Wallet[]; onClose: () => void;
}) {
  const [amount, setAmount] = useState((source.roomRental || 40).toString());
  const [walletId, setWalletId] = useState('wallet_cash');
  const [date, setDate] = useState(getToday());
  const [desc, setDesc] = useState('إيجار قاعة - 4GEEKS');

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    db.addExpense(amt, 'إيجار قاعة', walletId, date, desc || 'إيجار قاعة 4GEEKS', 'src_4geeks');
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="🏠 خصم إيجار قاعة 4GEEKS">
      <div className="space-y-4">
        <p className="text-xs text-purple-700 bg-purple-50 p-3 rounded-xl">
          سيتم خصم هذا المبلغ من المحفظة المحددة وتسجيله كمصروف عمل مرتبط بـ 4GEEKS.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">قيمة إيجار القاعة (ج.م)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">دُفعت من محفظة</label>
          <div className="grid grid-cols-3 gap-2">
            {wallets.map(w => (
              <button
                key={w.id}
                onClick={() => setWalletId(w.id)}
                className={`p-2 rounded-xl text-center text-xs font-medium ${walletId === w.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                <span className="text-sm block">{getWalletIcon(w.type)}</span>{w.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ دفع الإيجار</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة أو رقم الحصة</label>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="مثال: إيجار قاعة حصة السبت"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold active:scale-[0.98] shadow disabled:opacity-50"
        >
          تأكيد خصم الإيجار
        </button>
      </div>
    </Modal>
  );
}

// ============== Reports Section ==============
function ReportsSection({ studentStats, students, summary, isFarouk, is4Geeks, isCenterPays, faroukGroups }: {
  studentStats: Record<string, { totalEarned: number; totalPaid: number; remaining: number; paidToMe: number; paidToCenter: number; sessionsCount: number; status: string }>;
  students: CenterStudent[]; summary: Record<string, number>; isFarouk: boolean; is4Geeks: boolean; isCenterPays: boolean;
  faroukGroups?: Record<string, { count: number; earned: number; paid: number; remaining: number }>;
}) {
  const active = students.filter(s => s.isActive);
  const unpaid = active.filter(s => studentStats[s.id]?.status === 'unpaid');
  const partial = active.filter(s => studentStats[s.id]?.status === 'partial');
  const paid = active.filter(s => studentStats[s.id]?.status === 'paid');

  return (
    <div className="space-y-4">
      {/* Al Farouk Group Breakdown Report */}
      {isFarouk && faroukGroups && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-800 text-sm">تقرير المجموعات (سنتر الفاروق)</h3>
          <div className="space-y-2">
            {Object.entries(faroukGroups).map(([gName, gStat]) => (
              <div key={gName} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-800">{gName}</p>
                  <p className="text-gray-500 mt-0.5">{gStat.count} طالب • مستحق: {formatCurrency(gStat.earned)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-green-600">{formatCurrency(gStat.paid)}</p>
                  {gStat.remaining > 0 && <p className="text-red-500 font-bold">باقي: {formatCurrency(gStat.remaining)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Financial Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2 text-sm">
        <h3 className="font-bold text-gray-700">الملخص المالي العام</h3>
        <div className="flex justify-between"><span className="text-gray-500">إجمالي المستحق على الطلبة</span><span className="font-bold">{formatCurrency(summary.totalEarned as number)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">إجمالي ما تم تحصيله</span><span className="font-bold text-green-600">{formatCurrency(summary.totalPaid as number)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">استلمته فعلاً في محفظتي</span><span className="font-bold text-blue-600">{formatCurrency(summary.myActualReceived as number)}</span></div>
        {(isFarouk || isCenterPays) && (summary.owedByCenter as number) > 0 && (
          <div className="flex justify-between"><span className="text-amber-600">مستحق طرف السنتر</span><span className="font-bold text-amber-600">{formatCurrency(summary.owedByCenter as number)}</span></div>
        )}
        {is4Geeks && (
          <>
            <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-purple-700">إيجار القاعات المخصوم</span><span className="font-bold text-purple-700">-{formatCurrency(summary.roomRentalPaid as number)}</span></div>
            <div className="flex justify-between"><span className="text-gray-700 font-bold">صافي العائد الفعلي</span><span className="font-bold text-emerald-600 text-base">{formatCurrency(summary.netProfit as number)}</span></div>
          </>
        )}
      </div>

      {/* Lists */}
      {unpaid.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-red-700 mb-1">🔴 طلبة لم يدفعوا ({unpaid.length})</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {unpaid.map(s => (
              <div key={s.id} className="flex justify-between p-3 text-xs">
                <div>
                  <span className="font-bold text-gray-800">{s.name}</span>
                  {s.group && <span className="text-gray-400 mr-1.5">({s.group})</span>}
                </div>
                <span className="text-red-600 font-bold">{formatCurrency(studentStats[s.id]?.totalEarned || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {partial.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-700 mb-1">🟡 طلبة دفعوا جزئياً ({partial.length})</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {partial.map(s => (
              <div key={s.id} className="flex justify-between p-3 text-xs">
                <div>
                  <span className="font-bold text-gray-800">{s.name}</span>
                  {s.group && <span className="text-gray-400 mr-1.5">({s.group})</span>}
                </div>
                <span className="text-amber-600 font-bold">باقي: {formatCurrency(studentStats[s.id]?.remaining || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Add Student Modal ==============
function AddStudentModal({ centerId, onClose, isFarouk }: { centerId: string; onClose: () => void; isFarouk: boolean }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(isFarouk ? FAROUK_GROUPS[0] : '');
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

        {/* Group Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المجموعة / الصف</label>
          {isFarouk ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1.5">
                {FAROUK_GROUPS.map(grp => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setGroup(grp)}
                    className={`p-2.5 rounded-xl text-right text-xs font-bold transition-all border ${
                      group === grp ? 'bg-blue-600 text-white border-transparent' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    ✓ {grp}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={group}
                onChange={e => setGroup(e.target.value)}
                placeholder="أو اكتب اسم مجموعة أخرى..."
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <input
              type="text"
              value={group}
              onChange={e => setGroup(e.target.value)}
              placeholder="مثال: أولى ثانوي / المجموعة 1"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="مثال: رياضيات / برمجة"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
                className={`p-2 rounded-xl text-xs font-bold ${billingType === b.v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{b.l}</button>
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
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] shadow">حفظ الطالب</button>
      </div>
    </Modal>
  );
}

// ============== Edit Student Modal ==============
function EditStudentModal({ studentId, onClose, isFarouk }: { studentId: string; onClose: () => void; isFarouk: boolean }) {
  const [student, setStudent] = useState<CenterStudent | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [rate, setRate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const all = db.getCenterStudents();
    const st = all.find(s => s.id === studentId);
    if (st) {
      setStudent(st);
      setName(st.name);
      setGroup(st.group || '');
      setSubject(st.subject || '');
      setRate((st.ratePerLesson || st.monthlyRate || st.agreedAmount || 0).toString());
    }
  }, [studentId]);

  if (!student) return null;

  const handleUpdate = () => {
    const rateNum = parseFloat(rate) || 0;
    db.updateCenterStudent(studentId, {
      name,
      group: group || undefined,
      subject: subject || undefined,
      ratePerLesson: student.billingType === 'per_lesson' ? rateNum : undefined,
      monthlyRate: student.billingType === 'monthly' ? rateNum : undefined,
      agreedAmount: student.billingType === 'agreed' ? rateNum : undefined,
    });
    onClose();
  };

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
    <Modal isOpen={true} onClose={onClose} title="تعديل بيانات الطالب">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">الاسم</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">المجموعة</label>
          {isFarouk ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-1 gap-1">
                {FAROUK_GROUPS.map(grp => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setGroup(grp)}
                    className={`p-2 rounded-lg text-right text-xs font-medium border ${
                      group === grp ? 'bg-blue-600 text-white border-transparent' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ✓ {grp}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={group}
                onChange={e => setGroup(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>
          ) : (
            <input
              type="text"
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">المادة</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">المبلغ / سعر الحصة</label>
          <input type="number" value={rate} onChange={e => setRate(e.target.value)}
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none font-bold" />
        </div>

        <button onClick={handleUpdate} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs active:scale-[0.98]">
          حفظ التعديلات
        </button>

        <button onClick={handleToggleActive}
          className={`w-full py-2.5 rounded-xl font-medium text-xs ${student.isActive ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {student.isActive ? '⏸️ إيقاف الطالب مؤقتاً' : '▶️ إعادة تفعيل الطالب'}
        </button>

        <button onClick={handleDelete}
          className={`w-full py-2.5 rounded-xl font-bold text-xs ${confirmDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {confirmDelete ? 'تأكيد الحذف نهائياً' : '🗑️ حذف الطالب بالكامل'}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المدفوع (ج.م)</label>
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
                className={`p-2 rounded-xl text-center text-xs font-bold ${method === m.v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
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
                  className={`p-3 rounded-xl text-xs font-bold ${receivedBy === 'me' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  🙋 أنا (مباشرة)
                </button>
                <button onClick={() => setReceivedBy('center')}
                  className={`p-3 rounded-xl text-xs font-bold ${receivedBy === 'center' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  🏫 السنتر (تسوية لاحقاً)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">نصيبي من المبلغ</label>
                <input type="number" value={myShare} onChange={e => setMyShare(e.target.value)} placeholder={amount || '0'}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-500 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">نصيب السنتر</label>
                <input type="number" value={centerShareVal} onChange={e => setCenterShareVal(e.target.value)} placeholder="0"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-500 font-bold" />
              </div>
            </div>

            {receivedBy === 'center' && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                ⚠️ هذا المبلغ تم تحصيله بواسطة السنتر — سيظهر كمستحق لك لدى السنتر ولن يضاف لمحفظتك حتى تتم التسوية.
              </p>
            )}
          </>
        )}

        {isCenterPays && (
          <p className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
            ℹ️ في هذا السنتر، السنتر هو الذي يجمع ويحاسبك مباشرة. هذه الدفعة تسجل إبراء ذمة الطالب وتظهر في حساب السنتر.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] shadow">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">حالة الحضور</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'completed' as const, l: 'حضر', c: 'bg-green-600' },
              { v: 'cancelled' as const, l: 'غائب', c: 'bg-red-600' },
              { v: 'postponed' as const, l: 'مؤجل', c: 'bg-yellow-600' },
            ].map(s => (
              <button key={s.v} onClick={() => setStatus(s.v)}
                className={`p-2.5 rounded-xl text-xs font-bold ${status === s.v ? `${s.c} text-white` : 'bg-gray-100 text-gray-600'}`}>{s.l}</button>
            ))}
          </div>
        </div>
        {status === 'completed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستحق عن الحصة (ج.م)</label>
            <input type="number" value={earned} onChange={e => setEarned(e.target.value)} placeholder="0"
              className="w-full p-3 border border-gray-200 rounded-xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الحصة</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>
        <button onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold active:scale-[0.98] shadow">حفظ الحصة</button>
      </div>
    </Modal>
  );
}

// ============== Settlement Modal ==============
function SettlementModal({ centerId, sourceName, wallets, onClose }: {
  centerId: string; sourceName: string; wallets: Wallet[]; onClose: () => void;
}) {
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
    <Modal isOpen={true} onClose={onClose} title={`💰 استلام دفعة من ${sourceName}`}>
      <div className="space-y-4">
        <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
          هذا المبلغ الذي سلّمه لك السنتر مباشرة من مستحقاتك، وسيتم إضافته إلى المحفظة التي تختارها.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستلم (ج.م)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full p-4 border border-gray-200 rounded-xl text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-emerald-500" autoFocus />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تم الاستلام في محفظة</label>
          <div className="grid grid-cols-3 gap-2">
            {wallets.map(w => (
              <button key={w.id} onClick={() => setWalletId(w.id)}
                className={`p-2.5 rounded-xl text-center text-xs font-bold ${walletId === w.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                <span className="text-sm block">{getWalletIcon(w.type)}</span>{w.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستلام</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: تسوية دفعة شهر نوفمبر"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none" />
        </div>

        <button onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold disabled:opacity-50 active:scale-[0.98] shadow">
          تأكيد استلام الدفعة
        </button>
      </div>
    </Modal>
  );
}

// ============== Group Sessions Section (4GEEKS & classes) ==============
function GroupSessionsSection({
  sessions,
  students,
  onAdd,
  onDelete,
}: {
  sessions: CenterGroupSession[];
  students: CenterStudent[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Session Quick Overview Header */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-2xl p-4 text-white shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-base">سجل وجدول حصص 4GEEKS</h3>
            <p className="text-xs text-purple-200 mt-0.5">
              {sessions.length > 0 ? `تم إعطاء ${sessions.length} حصص حتى الآن` : 'لا توجد حصص مسجلة بعد'}
            </p>
          </div>
          <button
            onClick={onAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold active:scale-95 shadow transition-all flex items-center gap-1.5"
          >
            <span>➕</span> تسجيل حصة جديدة
          </button>
        </div>

        {sessions.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-700/60 text-center">
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[10px] text-purple-200">احنا في الحصة الكام؟</p>
              <p className="text-sm font-bold text-white">الحصة #{sessions[0].sessionNumber}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-[10px] text-purple-200">الحصة القادمة</p>
              <p className="text-sm font-bold text-amber-300">
                الحصة #{Math.max(...sessions.map(s => s.sessionNumber)) + 1}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* List of Sessions */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
          <p className="text-4xl mb-2">📅</p>
          <p className="font-medium text-sm">لم يتم تسجيل أي حصة حتى الآن</p>
          <button
            onClick={onAdd}
            className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            + تسجيل أول حصة
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(ses => {
            const attendeeStudents = students.filter(s => ses.attendeeStudentIds.includes(s.id));
            return (
              <div key={ses.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-lg font-extrabold">
                        الحصة رقم #{ses.sessionNumber}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">📅 {formatDate(ses.date)}</span>
                    </div>
                    {ses.topic && (
                      <p className="font-bold text-sm text-gray-800 mt-1.5">{ses.topic}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الحصة رقم #${ses.sessionNumber}؟`)) {
                        onDelete(ses.id);
                      }
                    }}
                    className="text-gray-300 hover:text-red-500 text-sm p-1 rounded-lg transition-colors"
                    title="حذف الحصة"
                  >
                    🗑️
                  </button>
                </div>

                {/* Attendees list */}
                <div className="pt-1 border-t border-gray-50">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span className="font-medium">الطلبة الحاضرين: <strong>{attendeeStudents.length} طالب</strong></span>
                    {ses.roomRentalAmount ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                        🏠 مخصوم إيجار القاعة ({ses.roomRentalAmount} ج.م)
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {attendeeStudents.map(st => (
                      <span
                        key={st.id}
                        className="bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5 rounded-full font-medium"
                      >
                        ✓ {st.name}
                      </span>
                    ))}
                    {attendeeStudents.length === 0 && (
                      <span className="text-gray-400 text-xs">لم يتم تسجيل حضور طلبة</span>
                    )}
                  </div>
                </div>

                {ses.notes && (
                  <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl">
                    📝 {ses.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============== Add Group Session Modal ==============
function AddGroupSessionModal({
  centerId,
  students,
  existingSessions,
  source,
  wallets,
  onClose,
}: {
  centerId: string;
  students: CenterStudent[];
  existingSessions: CenterGroupSession[];
  source: IncomeSource;
  wallets: Wallet[];
  onClose: () => void;
}) {
  const nextNumber = existingSessions.length > 0 
    ? Math.max(...existingSessions.map(s => s.sessionNumber)) + 1 
    : 1;

  const [sessionNumber, setSessionNumber] = useState(String(nextNumber));
  const [date, setDate] = useState(getToday());
  const [topic, setTopic] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(students.map(s => s.id));
  const [deductRoomRental, setDeductRoomRental] = useState(true);
  const [rentalWalletId, setRentalWalletId] = useState('wallet_cash');
  const [notes, setNotes] = useState('');

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedStudentIds(students.map(s => s.id));
  const deselectAll = () => setSelectedStudentIds([]);

  const handleSave = () => {
    const num = parseInt(sessionNumber) || nextNumber;
    const roomRentalRate = source?.roomRental || 40;
    const rentalAmount = deductRoomRental ? roomRentalRate : undefined;

    // 1. Add Group Session record
    db.addCenterGroupSession({
      centerId,
      sessionNumber: num,
      date,
      topic: topic || undefined,
      attendeeStudentIds: selectedStudentIds,
      roomRentalAmount: rentalAmount,
      notes: notes || undefined,
    });

    // 2. Add individual StudentSession for each attendee so their lesson ledger updates!
    selectedStudentIds.forEach(stId => {
      const student = students.find(s => s.id === stId);
      const rate = student?.ratePerLesson || 0;
      db.addStudentSession({
        studentId: stId,
        centerId,
        date,
        amountEarned: rate,
        status: 'completed',
        notes: `حصة جماعية رقم #${num}${topic ? ` (${topic})` : ''}`,
      });
    });

    // 3. Deduct room rental as an expense transaction if chosen
    if (deductRoomRental) {
      db.addExpense(
        roomRentalRate,
        'إيجار قاعة',
        rentalWalletId,
        date,
        `إيجار قاعة 4GEEKS - الحصة رقم #${num}`,
        'src_4geeks'
      );
    }

    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="📅 تسجيل حصة جديدة في 4GEEKS">
      <div className="space-y-4">
        {/* Session Number & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">رقم الحصة</label>
            <input
              type="number"
              value={sessionNumber}
              onChange={e => setSessionNumber(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-center font-bold text-lg outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الحصة</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Topic / Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">موضوع أو عنوان الحصة (اختياري)</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="مثال: مقدمة البرمجة والمنطق البرمجي"
            className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Attendees Checklist */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-700">
              الطلبة الحاضرين ({selectedStudentIds.length} من {students.length})
            </label>
            <div className="flex gap-2 text-[11px]">
              <button type="button" onClick={selectAll} className="text-purple-600 font-bold hover:underline">
                تحديد الكل
              </button>
              <span>•</span>
              <button type="button" onClick={deselectAll} className="text-gray-500 hover:underline">
                إلغاء الكل
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200">
            {students.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">لا يوجد طلبة مسجلين بعد</p>
            ) : (
              students.map(st => {
                const isChecked = selectedStudentIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isChecked ? 'bg-purple-50 border border-purple-200 text-purple-900 font-medium' : 'bg-white text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStudent(st.id)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>{st.name}</span>
                    </div>
                    {st.ratePerLesson ? (
                      <span className="text-[10px] text-gray-400">{formatCurrency(st.ratePerLesson)}</span>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Room Rental Option */}
        <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-900">
            <input
              type="checkbox"
              checked={deductRoomRental}
              onChange={e => setDeductRoomRental(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
            />
            <span>خصم إيجار القاعة لهذه الحصة ({source?.roomRental || 40} ج.م)</span>
          </label>

          {deductRoomRental && (
            <div>
              <p className="text-[11px] text-purple-700 mb-1">دفع إيجار القاعة من محفظة:</p>
              <div className="grid grid-cols-3 gap-1.5">
                {wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setRentalWalletId(w.id)}
                    className={`p-2 rounded-lg text-center text-[11px] font-bold transition-all ${
                      rentalWalletId === w.id ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-purple-100'
                    }`}
                  >
                    <span>{getWalletIcon(w.type)}</span> {w.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات إضافية (اختياري)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="ملاحظات الحصة..."
            className="w-full p-3 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white py-4 rounded-xl font-bold active:scale-[0.98] shadow text-sm"
        >
          ✓ حفظ الحصة وتسجيل الحضور
        </button>
      </div>
    </Modal>
  );
}
