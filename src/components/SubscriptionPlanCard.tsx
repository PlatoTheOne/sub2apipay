'use client';

import React from 'react';
import type { Locale } from '@/lib/locale';
import { pickLocaleText } from '@/lib/locale';
import { formatValidityLabel, formatValiditySuffix, type ValidityUnit } from '@/lib/subscription-utils';
import { PlatformBadge } from '@/lib/platform-style';

export interface PlanInfo {
  id: string;
  groupId: number;
  groupName: string | null;
  name: string;
  price: number;
  originalPrice: number | null;
  validityDays: number;
  validityUnit?: ValidityUnit;
  features: string[];
  description: string | null;
  platform: string | null;
  rateMultiplier: number | null;
  limits: {
    daily_limit_usd: number | null;
    weekly_limit_usd: number | null;
    monthly_limit_usd: number | null;
  } | null;
  allowMessagesDispatch: boolean;
  defaultMappedModel: string | null;
}

interface SubscriptionPlanCardProps {
  plan: PlanInfo;
  onSubscribe: (planId: string) => void;
  isDark: boolean;
  locale: Locale;
}

export default function SubscriptionPlanCard({ plan, onSubscribe, isDark, locale }: SubscriptionPlanCardProps) {
  const unit = plan.validityUnit ?? 'day';
  const periodLabel = formatValidityLabel(plan.validityDays, unit, locale);
  const periodSuffix = formatValiditySuffix(plan.validityDays, unit, locale);

  const hasLimits = plan.limits && (
    plan.limits.daily_limit_usd !== null ||
    plan.limits.weekly_limit_usd !== null ||
    plan.limits.monthly_limit_usd !== null
  );

  const isOpenAI = plan.platform?.toLowerCase() === 'openai';

  return (
    <div
      className={[
        'flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-lg',
        isDark ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      {/* Header: Platform badge + Name + Period */}
      <div className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {plan.platform && <PlatformBadge platform={plan.platform} />}
          <h3 className={['text-lg font-bold', isDark ? 'text-slate-100' : 'text-slate-900'].join(' ')}>
            {plan.name}
          </h3>
          <span
            className={[
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {periodLabel}
          </span>
          {isOpenAI && plan.allowMessagesDispatch && (
            <span className={[
              'rounded-full px-2 py-0.5 text-xs font-medium',
              isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700',
            ].join(' ')}>
              /v1/messages
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          {plan.originalPrice !== null && (
            <span className={['text-sm line-through', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
              ¥{plan.originalPrice}
            </span>
          )}
          <span className="text-3xl font-bold text-emerald-500">¥{plan.price}</span>
          <span className={['text-sm', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
            {periodSuffix}
          </span>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <p className={['mb-4 text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
          {plan.description}
        </p>
      )}

      {/* Rate + Limits grid */}
      {(plan.rateMultiplier != null || hasLimits) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {plan.rateMultiplier != null && (
            <div>
              <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                {pickLocaleText(locale, '倍率', 'Rate')}
              </span>
              <div className="flex items-baseline">
                <span className="text-lg font-bold text-emerald-500">1</span>
                <span className={['mx-1 text-base', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>:</span>
                <span className="text-lg font-bold text-emerald-500">{plan.rateMultiplier}</span>
              </div>
            </div>
          )}
          {plan.limits?.daily_limit_usd !== null && plan.limits?.daily_limit_usd !== undefined && (
            <div>
              <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                {pickLocaleText(locale, '日限额', 'Daily Limit')}
              </span>
              <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                ${plan.limits.daily_limit_usd}
              </div>
            </div>
          )}
          {plan.limits?.weekly_limit_usd !== null && plan.limits?.weekly_limit_usd !== undefined && (
            <div>
              <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                {pickLocaleText(locale, '周限额', 'Weekly Limit')}
              </span>
              <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                ${plan.limits.weekly_limit_usd}
              </div>
            </div>
          )}
          {plan.limits?.monthly_limit_usd !== null && plan.limits?.monthly_limit_usd !== undefined && (
            <div>
              <span className={['text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                {pickLocaleText(locale, '月限额', 'Monthly Limit')}
              </span>
              <div className={['text-lg font-semibold', isDark ? 'text-slate-200' : 'text-slate-800'].join(' ')}>
                ${plan.limits.monthly_limit_usd}
              </div>
            </div>
          )}
        </div>
      )}

      {/* OpenAI specific: default model */}
      {isOpenAI && plan.defaultMappedModel && (
        <div className={[
          'mb-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
          isDark ? 'border-green-500/20 bg-green-500/5' : 'border-green-500/20 bg-green-50/50',
        ].join(' ')}>
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {pickLocaleText(locale, '默认模型', 'Default Model')}
          </span>
          <span className={['text-xs font-mono', isDark ? 'text-slate-300' : 'text-slate-700'].join(' ')}>
            {plan.defaultMappedModel}
          </span>
        </div>
      )}

      {/* Features */}
      {plan.features.length > 0 && (
        <div className="mb-5">
          <p className={['mb-2 text-xs', isDark ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
            {pickLocaleText(locale, '功能特性', 'Features')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {plan.features.map((feature) => (
              <span
                key={feature}
                className={[
                  'rounded-md px-2 py-1 text-xs',
                  isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
                ].join(' ')}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Subscribe button */}
      <button
        type="button"
        onClick={() => onSubscribe(plan.id)}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 active:bg-emerald-700"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {pickLocaleText(locale, '立即开通', 'Subscribe Now')}
      </button>
    </div>
  );
}
