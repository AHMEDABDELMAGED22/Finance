'use client';

import React from 'react';
import { CenterCycleStats } from '@/db/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  stats: CenterCycleStats;
  compact?: boolean;
  onAddSession?: () => void;
  onSettle?: () => void;
  centerName?: string;
}

export default function CenterSessionMeter({
  stats,
  compact = false,
  onAddSession,
  onSettle,
  centerName,
}: Props) {
  const {
    totalSessions,
    cycleNumber,
    sessionInCycle,
    hasPassed8,
    completedCycles,
    owedToMe,
  } = stats;

  // Percentage within the current 8-session cycle
  const cyclePercent = Math.min(100, Math.round((sessionInCycle / 8) * 100));

  // Compact Mode (for list cards in /centers)
  if (compact) {
    return (
      <div className="space-y-1.5 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-700">
              دورة الحصص: {sessionInCycle}/8
            </span>
            {cycleNumber > 1 && (
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                دورة #{cycleNumber}
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400">
            إجمالي {totalSessions} حصة
          </span>
        </div>

        {/* 8-segment mini bar */}
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }).map((_, i) => {
            const isFilled = i < sessionInCycle;
            return (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  isFilled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
                title={`حصة ${i + 1} من 8`}
              />
            );
          })}
        </div>

        {/* If passed 8 sessions, prominently show owed money */}
        {hasPassed8 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-amber-600 font-bold">⚡ عدت 8 حصص!</span>
              <span className="text-[10px] text-amber-700">مستحق لك:</span>
            </div>
            <span className="font-extrabold text-amber-800">
              {formatCurrency(owedToMe)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full / Detailed Mode (for Center Detail page)
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-gray-800">
              مؤشر دورة الـ 8 حصص
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-black">
              الدورة رقم #{cycleNumber}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalSessions === 0
              ? 'لم تبدأ الحصص بعد في هذا السنتر'
              : sessionInCycle === 8
              ? 'اكتملت 8 من 8 حصص لهذه الدورة!'
              : `تم إعطاء ${sessionInCycle} من 8 حصص (متبقي ${8 - sessionInCycle} حصص على نهاية الدورة)`}
          </p>
        </div>

        {onAddSession && (
          <button
            onClick={onAddSession}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1"
          >
            <span>➕</span> تسجيل حصة
          </button>
        )}
      </div>

      {/* 8-step Interactive Visual Meter */}
      <div className="grid grid-cols-8 gap-1.5 pt-1">
        {Array.from({ length: 8 }).map((_, i) => {
          const stepNum = i + 1;
          const isDone = stepNum <= sessionInCycle;
          const isCurrent = stepNum === sessionInCycle;
          const isNext = stepNum === sessionInCycle + 1;

          return (
            <div
              key={i}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all border text-center ${
                isDone
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-sm'
                  : isNext
                  ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span className="text-[10px] font-bold opacity-80">حصة</span>
              <span className="text-sm font-black leading-tight">{stepNum}</span>
              <span className="text-[10px] mt-0.5">
                {isDone ? '✓' : isNext ? '▶' : '○'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar info */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>تقدم الدورة الحالية: {cyclePercent}%</span>
          <span>إجمالي ما تم إعطاؤه بالسنتر: <strong>{totalSessions} حصة</strong></span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              sessionInCycle === 8 ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }`}
            style={{ width: `${cyclePercent}%` }}
          />
        </div>
      </div>

      {/* Passed 8 Sessions Alert & Owed Calculation Box */}
      {hasPassed8 ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <div>
                <p className="font-extrabold text-amber-900 text-sm">
                  تم إتمام دورة الـ 8 حصص ({completedCycles} دورة مكتملة)
                </p>
                <p className="text-[11px] text-amber-800">
                  بدأ العداد تلقائياً في دورة جديدة (أنت الآن في الحصة {sessionInCycle} من 8)
                </p>
              </div>
            </div>
            <span className="bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-black">
              دورة #{cycleNumber}
            </span>
          </div>

          <div className="bg-white/80 rounded-xl p-3 border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">المستحق لك طرف {centerName || 'السنتر'}:</p>
              <p className="text-2xl font-black text-amber-900">
                {formatCurrency(owedToMe)}
              </p>
              {stats.totalSettled > 0 && (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  تم تسليمه لك مسبقاً: {formatCurrency(stats.totalSettled)}
                </p>
              )}
            </div>

            {onSettle && (
              <button
                onClick={onSettle}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>💰</span> استلام دفعة من السنتر
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-2.5 text-xs text-gray-500 flex items-center justify-between border border-gray-100">
          <span>
            💡 بمجرد إتمام الحصة رقم 8، سيبدأ العداد دورة جديدة ويظهر لك فوراً كشف بالمستحق لك طرف السنتر.
          </span>
          <span className="font-bold text-gray-700 whitespace-nowrap mr-2">
            باقي {Math.max(0, 8 - sessionInCycle)} حصص
          </span>
        </div>
      )}
    </div>
  );
}
