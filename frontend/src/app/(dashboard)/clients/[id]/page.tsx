'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { clientsApi, alertsApi } from '@/lib/api';
import type { Client } from '@/types';
import { RiskBadge } from '@/components/clients/risk-badge';
import { AlertBadge } from '@/components/alerts/alert-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchClient = () => {
    setLoading(true);
    clientsApi
      .get(id)
      .then(setClient)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await alertsApi.resolve(alertId);
      fetchClient();
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando cliente…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center text-red-600">
          {error || 'Cliente no encontrado'}
        </div>
      </div>
    );
  }

  const activeAlerts = client.alerts?.filter((a) => !a.is_resolved) ?? [];
  const resolvedAlerts = client.alerts?.filter((a) => a.is_resolved) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Volver a clientes
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              ID: {client.identification}
            </p>
          </div>
          <RiskBadge level={client.risk_level} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <InfoItem label="Nacionalidad" value={client.nationality?.name ?? '—'} />
          <InfoItem label="Actividad económica" value={client.economicActivity?.name ?? '—'} />
          <InfoItem label="Origen de fondos" value={client.fundOrigin?.name ?? '—'} />
          <InfoItem
            label="Monto estimado mensual"
            value={formatCurrency(client.estimated_monthly_amount)}
          />
          <InfoItem
            label="Registrado por"
            value={client.creator?.name ?? '—'}
          />
          <InfoItem label="Fecha registro" value={formatDate(client.created_at)} />
        </div>
      </div>

      {/* Active alerts */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Alertas activas
          </h2>
          {activeAlerts.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              {activeAlerts.length}
            </span>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            ✓ Sin alertas activas
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activeAlerts.map((alert) => (
              <li key={alert.id} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <AlertBadge type={alert.type} />
                  <p className="mt-1 text-sm text-gray-600">{alert.description}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(alert.created_at)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="btn-secondary text-xs py-1"
                  >
                    {resolvingId === alert.id ? 'Resolviendo…' : 'Resolver'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Resolved alerts (collapsed) */}
      {resolvedAlerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-500">
              Alertas resueltas ({resolvedAlerts.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {resolvedAlerts.map((alert) => (
              <li key={alert.id} className="px-6 py-4 opacity-60">
                <AlertBadge type={alert.type} />
                <p className="mt-1 text-sm text-gray-500">{alert.description}</p>
                {alert.resolver && (
                  <p className="mt-1 text-xs text-gray-400">
                    Resuelta por {alert.resolver.name}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
