'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { catalogsApi, clientsApi, ApiError } from '@/lib/api';
import type {
  CreateClientPayload,
  EconomicActivity,
  FundOrigin,
  Nationality,
} from '@/types';
import { formatCurrency } from '@/lib/utils';

type FormValues = {
  fullName: string;
  identification: string;
  nationalityId: string;
  economicActivityId: string;
  fundOriginId: string;
  estimatedMonthlyAmount: string;
};

export default function NewClientPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [activities, setActivities] = useState<EconomicActivity[]>([]);
  const [fundOrigins, setFundOrigins] = useState<FundOrigin[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    Promise.all([
      catalogsApi.nationalities(),
      catalogsApi.economicActivities(),
      catalogsApi.fundOrigins(),
    ])
      .then(([n, a, f]) => {
        setNationalities(n);
        setActivities(a);
        setFundOrigins(f);
      })
      .finally(() => setLoadingCatalogs(false));
  }, []);

  const amountValue = watch('estimatedMonthlyAmount');
  const parsedAmount = parseFloat(amountValue?.replace(/\./g, '').replace(',', '.') ?? '0');

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    const payload: CreateClientPayload = {
      fullName: values.fullName,
      identification: values.identification,
      nationalityId: parseInt(values.nationalityId, 10),
      economicActivityId: parseInt(values.economicActivityId, 10),
      fundOriginId: parseInt(values.fundOriginId, 10),
      estimatedMonthlyAmount: parseFloat(values.estimatedMonthlyAmount),
    };

    try {
      const client = await clientsApi.create(payload);
      router.push(`/clients/${client.id}`);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : 'Error al registrar el cliente',
      );
    }
  };

  if (loadingCatalogs) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando formulario…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Registrar cliente KYC</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete los datos. El nivel de riesgo se calculará automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Full name */}
        <div>
          <label className="form-label">Nombre completo *</label>
          <input
            {...register('fullName', { required: 'Requerido' })}
            className="form-input"
            placeholder="Ej. Juan Pérez García"
          />
          {errors.fullName && (
            <p className="form-error">{errors.fullName.message}</p>
          )}
        </div>

        {/* Identification */}
        <div>
          <label className="form-label">Número de identificación *</label>
          <input
            {...register('identification', { required: 'Requerido' })}
            className="form-input"
            placeholder="CC, CE, Pasaporte…"
          />
          {errors.identification && (
            <p className="form-error">{errors.identification.message}</p>
          )}
        </div>

        {/* Nationality */}
        <div>
          <label className="form-label">Nacionalidad *</label>
          <select
            {...register('nationalityId', { required: 'Requerido' })}
            className="form-input"
          >
            <option value="">— Seleccione —</option>
            {nationalities.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} {n.is_foreign ? '(Extranjero)' : ''}
              </option>
            ))}
          </select>
          {errors.nationalityId && (
            <p className="form-error">{errors.nationalityId.message}</p>
          )}
        </div>

        {/* Economic activity */}
        <div>
          <label className="form-label">Actividad económica *</label>
          <select
            {...register('economicActivityId', { required: 'Requerido' })}
            className="form-input"
          >
            <option value="">— Seleccione —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.economicActivityId && (
            <p className="form-error">{errors.economicActivityId.message}</p>
          )}
        </div>

        {/* Fund origin */}
        <div>
          <label className="form-label">Origen de fondos *</label>
          <select
            {...register('fundOriginId', { required: 'Requerido' })}
            className="form-input"
          >
            <option value="">— Seleccione —</option>
            {fundOrigins.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.is_cash ? '💵' : ''}
              </option>
            ))}
          </select>
          {errors.fundOriginId && (
            <p className="form-error">{errors.fundOriginId.message}</p>
          )}
        </div>

        {/* Monthly amount */}
        <div>
          <label className="form-label">Monto estimado mensual (COP) *</label>
          <input
            {...register('estimatedMonthlyAmount', {
              required: 'Requerido',
              min: { value: 0, message: 'Debe ser mayor o igual a 0' },
            })}
            type="number"
            min="0"
            step="1000"
            className="form-input"
            placeholder="Ej. 3500000"
          />
          {amountValue && !isNaN(parsedAmount) && parsedAmount > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {formatCurrency(parsedAmount)}
            </p>
          )}
          {errors.estimatedMonthlyAmount && (
            <p className="form-error">{errors.estimatedMonthlyAmount.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Registrando…' : 'Registrar cliente'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
