'use client';

import { getPaymentDisplayInfo, formatStatus, formatCreatedAt } from '@/lib/pay-utils';
import type { Locale } from '@/lib/locale';

interface Order {
  id: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userNotes: string | null;
  amount: number;
  status: string;
  paymentType: string;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  failedReason: string | null;
  expiresAt: string;
  srcHost: string | null;
  rechargeRetryable?: boolean;
}

interface OrderTableProps {
  orders: Order[];
  onRetry: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onViewDetail: (orderId: string) => void;
  dark?: boolean;
  locale?: Locale;
}

export default function OrderTable({ orders, onRetry, onCancel, onViewDetail, dark, locale = 'zh' }: OrderTableProps) {
  const currency = locale === 'en' ? '$' : '¥';
  const text =
    locale === 'en'
      ? {
          orderId: 'Order ID',
          userName: 'Username',
          email: 'Email',
          notes: 'Notes',
          amount: 'Amount',
          status: 'Status',
          paymentMethod: 'Payment',
          source: 'Source',
          createdAt: 'Created At',
          actions: 'Actions',
          retry: 'Retry',
          cancel: 'Cancel',
          empty: 'No orders',
        }
      : {
          orderId: '订单号',
          userName: '用户名',
          email: '邮箱',
          notes: '备注',
          amount: '金额',
          status: '状态',
          paymentMethod: '支付方式',
          source: '来源',
          createdAt: '创建时间',
          actions: '操作',
          retry: '重试',
          cancel: '取消',
          empty: '暂无订单',
        };

  const thCls = `px-4 py-3 text-left text-xs font-medium uppercase ${dark ? 'text-slate-400' : 'text-gray-500'}`;
  const tdMuted = `whitespace-nowrap px-4 py-3 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`;

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y ${dark ? 'divide-slate-700' : 'divide-gray-200'}`}>
        <thead className={dark ? 'bg-slate-800/50' : 'bg-gray-50'}>
          <tr>
            <th className={thCls}>{text.orderId}</th>
            <th className={thCls}>{text.userName}</th>
            <th className={thCls}>{text.email}</th>
            <th className={thCls}>{text.notes}</th>
            <th className={thCls}>{text.amount}</th>
            <th className={thCls}>{text.status}</th>
            <th className={thCls}>{text.paymentMethod}</th>
            <th className={thCls}>{text.source}</th>
            <th className={thCls}>{text.createdAt}</th>
            <th className={thCls}>{text.actions}</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${dark ? 'divide-slate-700/60' : 'divide-gray-200 bg-white'}`}>
          {orders.map((order) => {
            const statusInfo = {
              label: formatStatus(order.status, locale),
              light:
                order.status === 'FAILED' || order.status === 'REFUND_FAILED'
                  ? 'bg-red-100 text-red-800'
                  : order.status === 'REFUNDED'
                    ? 'bg-purple-100 text-purple-800'
                    : order.status === 'REFUNDING'
                      ? 'bg-orange-100 text-orange-800'
                      : order.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'PAID' || order.status === 'RECHARGING'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800',
              dark:
                order.status === 'FAILED' || order.status === 'REFUND_FAILED'
                  ? 'bg-red-500/20 text-red-300'
                  : order.status === 'REFUNDED'
                    ? 'bg-purple-500/20 text-purple-300'
                    : order.status === 'REFUNDING'
                      ? 'bg-orange-500/20 text-orange-300'
                      : order.status === 'COMPLETED'
                        ? 'bg-green-500/20 text-green-300'
                        : order.status === 'PAID' || order.status === 'RECHARGING'
                          ? 'bg-blue-500/20 text-blue-300'
                          : order.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-slate-600/30 text-slate-400',
            };
            return (
              <tr key={order.id} className={dark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <button
                    onClick={() => onViewDetail(order.id)}
                    className={dark ? 'text-indigo-400 hover:underline' : 'text-blue-600 hover:underline'}
                  >
                    {order.id.slice(0, 12)}...
                  </button>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-sm ${dark ? 'text-slate-200' : ''}`}>
                  {order.userName || `#${order.userId}`}
                </td>
                <td className={tdMuted}>{order.userEmail || '-'}</td>
                <td className={tdMuted}>{order.userNotes || '-'}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${dark ? 'text-slate-200' : ''}`}>
                  {currency}
                  {order.amount.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${dark ? statusInfo.dark : statusInfo.light}`}
                  >
                    {statusInfo.label}
                  </span>
                </td>
                <td className={tdMuted}>
                  {(() => {
                    const { channel, provider } = getPaymentDisplayInfo(order.paymentType, locale);
                    return (
                      <>
                        {channel}
                        {provider && (
                          <span className={dark ? 'ml-1 text-xs text-slate-500' : 'ml-1 text-xs text-slate-400'}>
                            {provider}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </td>
                <td className={tdMuted}>{order.srcHost || '-'}</td>
                <td className={tdMuted}>{formatCreatedAt(order.createdAt, locale)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex gap-1">
                    {order.rechargeRetryable && (
                      <button
                        onClick={() => onRetry(order.id)}
                        className={`rounded px-2 py-1 text-xs ${dark ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                      >
                        {text.retry}
                      </button>
                    )}
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => onCancel(order.id)}
                        className={`rounded px-2 py-1 text-xs ${dark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                      >
                        {text.cancel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className={`py-12 text-center ${dark ? 'text-slate-500' : 'text-gray-500'}`}>{text.empty}</div>
      )}
    </div>
  );
}
