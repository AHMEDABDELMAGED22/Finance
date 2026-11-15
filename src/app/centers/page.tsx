'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import * as db from '@/db/database';
import { formatCurrency } from '@/lib/utils';
import { IncomeSource } from '@/db/types';

const CENTER_IDS = ['src_farouk', 'src_manara', 'src_roya', 'src_4geeks'];

const centerIcons: Record<string, string> = {
  src_farouk: '🏫',
  src_manara: '🏢',
  src_roya: '🏛️',
  src_4geeks: '💻',
};

export default function CentersPage() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSources(db.getIncomeSources().filter(s => CENTER_IDS.includes(s.id)));
    setMounted(true);
  }, []);

  const centerStats = useMemo(() => {
    if (!mounted) return {};
    const stats: Record<string, { students: number; owed: number; collected: number; outstanding: number }> = {};
    CENTER_IDS.forEach(cId => {
      const students = db.getCenterStudents(cId).filter(s => s.isActive);
      const sessions = db.getStudentSessions(cId).filter(s => s.status === 'completed');
      const payments = db.getStudentPayments(cId);
      const settlements = db.getCenterSettlements(cId);

      const totalEarned = sessions.reduce((s, ses) => s + ses.amountEarned, 0);
      const paidToMe = payments.filter(p => p.receivedBy === 'me').reduce((s, p) => s + (p.myShare ?? p.amount), 0);
      const paidToCenter = payments.filter(p => p.receivedBy === 'center').reduce((s, p) => s + (p.myShare ?? p.amount), 0);
      const settledByCenter = settlements.reduce((s, st) => s + st.amount, 0);

      stats[cId] = {
        students: students.length,
        owed: totalEarned,
        collected: paidToMe + settledByCenter,
        outstanding: paidToCenter - settledByCenter,
      };
    });
    return stats;
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">🏫 السناتر</h1>
      <p className="text-sm text-gray-500">إدارة الطلبة والتحصيل</p>

      <div className="space-y-3">
        {sources.map(src => {
          const stats = centerStats[src.id];
          const typeLabel =
            src.id === 'src_farouk' ? 'الطالب يدفع لي أو للسنتر' :
            src.id === 'src_4geeks' ? 'أنا أجمع الفلوس + إيجار قاعة' :
            'السنتر يجمع ويدفع لي';

          return (
            <Link key={src.id} href={`/centers/${src.id}`}
              className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{centerIcons[src.id] || '🏫'}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800">{src.nameAr}</h2>
                  <p className="text-xs text-gray-500 mb-3">{typeLabel}</p>

                  {stats && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-gray-700">{stats.students}</p>
                        <p className="text-[10px] text-gray-500">طالب</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-bold text-green-700">{formatCurrency(stats.collected)}</p>
                        <p className="text-[10px] text-green-600">تم تحصيله</p>
                      </div>
                      {stats.outstanding > 0 && (
                        <div className="bg-amber-50 rounded-lg p-2 text-center col-span-2">
                          <p className="text-sm font-bold text-amber-700">{formatCurrency(stats.outstanding)}</p>
                          <p className="text-[10px] text-amber-600">مستحق لدى السنتر</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-gray-300 text-xl mt-2">←</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
