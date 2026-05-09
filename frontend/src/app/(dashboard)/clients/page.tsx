'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clientsApi } from '@/lib/api';
import type { Client } from '@/types';
import { RiskBadge } from '@/components/clients/risk-badge';
import { AlertBadge } from '@/components/alerts/alert-badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    clientsApi
      .list()
      .then(setClients)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.identification.includes(search),
  );

  // Stats
  const counts = { BAJO: 0, MEDIO: 0, ALTO: 0 };
  clients.forEach((c) => counts[c.risk_level]++);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes KYC</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y evaluación de riesgo de clientes registrados
          </p>
        </div>
        <Link href="/clients/new" className="btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            { label: 'Riesgo Bajo', key: 'BAJO', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Riesgo Medio', key: 'MEDIO', color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Riesgo Alto', key: 'ALTO', color: 'text-red-600', bg: 'bg-red-50' },
          ] as const
        ).map(({ label, key, color, bg }) => (
          <div key={key} className={`card p-4 ${bg}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {label}
            </p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{counts[key]}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="Buscar por nombre o identificación…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando clientes…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {search ? 'Sin resultados para la búsqueda.' : 'No hay clientes registrados aún.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Nombre', 'Identificación', 'Nacionalidad', 'Origen fondos', 'Monto mensual', 'Riesgo', 'Alertas', 'Registrado', ''].map(
                    (th) => (
                      <th
                        key={th}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {th}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {client.full_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {client.identification}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {client.nationality?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {client.fundOrigin?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatCurrency(client.estimated_monthly_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <RiskBadge level={client.risk_level} size="sm" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {client.alerts && client.alerts.length > 0 ? (
                        <div className="inline-flex flex-wrap gap-1">
                          {client.alerts.slice(0, 3).map((alert) => (
                            <AlertBadge key={alert.id} type={alert.type} />
                          ))}
                          {client.alerts.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                              +{client.alerts.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
