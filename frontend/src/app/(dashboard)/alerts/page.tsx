'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { alertsApi } from '@/lib/api';
import type { Alert } from '@/types';
import { AlertBadge } from '@/components/alerts/alert-badge';
import { RiskBadge } from '@/components/clients/risk-badge';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';

type Filter = 'all' | 'pending' | 'resolved';

export default function AlertsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    const resolved =
      filter === 'pending' ? false : filter === 'resolved' ? true : undefined;
    alertsApi
      .list(resolved)
      .then(setAlerts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await alertsApi.resolve(id);
      fetchAlerts();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas del sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Situaciones detectadas que requieren atención o revisión
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: 'pending', label: 'Pendientes' },
            { key: 'resolved', label: 'Resueltas' },
            { key: 'all', label: 'Todas' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando alertas…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {filter === 'pending' ? '✓ Sin alertas pendientes' : 'Sin resultados'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`px-6 py-4 ${alert.is_resolved ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertBadge type={alert.type} />
                      {alert.client && (
                        <RiskBadge level={alert.client.risk_level} size="sm" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{alert.description}</p>
                    {alert.client && (
                      <p className="text-xs text-gray-500">
                        Cliente:{' '}
                        <Link
                          href={`/clients/${alert.client.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {alert.client.full_name}
                        </Link>{' '}
                        · {alert.client.identification}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(alert.created_at)}</p>
                    {alert.is_resolved && alert.resolver && (
                      <p className="text-xs text-green-600">
                        ✓ Resuelta por {alert.resolver.name}
                      </p>
                    )}
                  </div>

                  {isAdmin && !alert.is_resolved && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="btn-secondary text-xs py-1.5 shrink-0"
                    >
                      {resolvingId === alert.id ? 'Resolviendo…' : 'Marcar resuelta'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
