import type {
  Alert,
  Client,
  CreateClientPayload,
  EconomicActivity,
  FundOrigin,
  Nationality,
} from '@/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: 'Error de red' })) as { message?: string };
    throw new ApiError(res.status, body.message ?? 'Error desconocido');
  }

  return res.json() as Promise<T>;
}

// ─── Client resources ────────────────────────────────────────────────────────

export const clientsApi = {
  list: () => request<Client[]>('/clients'),
  get: (id: string) => request<Client>(`/clients/${id}`),
  create: (payload: CreateClientPayload) =>
    request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ─── Alert resources ─────────────────────────────────────────────────────────

export const alertsApi = {
  list: (resolved?: boolean) =>
    request<Alert[]>(
      `/alerts${resolved !== undefined ? `?resolved=${resolved}` : ''}`,
    ),
  resolve: (id: string) =>
    request<Alert>(`/alerts/${id}/resolve`, { method: 'PATCH' }),
};

// ─── Catalog resources ────────────────────────────────────────────────────────

export const catalogsApi = {
  nationalities: () =>
    request<Nationality[]>('/catalogs/nationalities'),
  economicActivities: () =>
    request<EconomicActivity[]>('/catalogs/economic-activities'),
  fundOrigins: () => request<FundOrigin[]>('/catalogs/fund-origins'),
};

export { ApiError };
