export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';
export type UserRole = 'admin' | 'analista';

export type AlertType =
  | 'EFECTIVO_ALTO'
  | 'EXTRANJERO_EFECTIVO_ALTO'
  | 'RIESGO_ALTO'
  | 'DATOS_INCOMPLETOS'
  | 'USO_TERCEROS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
}

export interface Nationality {
  id: number;
  name: string;
  code: string;
  is_foreign: boolean;
}

export interface EconomicActivity {
  id: number;
  name: string;
  risk_weight: number;
}

export interface FundOrigin {
  id: number;
  name: string;
  is_cash: boolean;
  risk_weight: number;
}

export interface Client {
  id: string;
  full_name: string;
  identification: string;
  nationality_id: number;
  economic_activity_id: number;
  fund_origin_id: number;
  estimated_monthly_amount: number | string;
  risk_level: RiskLevel;
  riskScore?: number;
  alertsGenerated?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  nationality?: Nationality;
  economicActivity?: EconomicActivity;
  fundOrigin?: FundOrigin;
  creator?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  alerts?: Alert[];
}

export interface Alert {
  id: string;
  client_id: string;
  type: AlertType;
  description: string;
  is_resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  client?: Pick<Client, 'id' | 'full_name' | 'identification' | 'risk_level'>;
  resolver?: Pick<User, 'id' | 'name'> | null;
}

export interface CreateClientPayload {
  fullName: string;
  identification: string;
  nationalityId: number;
  economicActivityId: number;
  fundOriginId: number;
  estimatedMonthlyAmount: number;
}
