import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';

export type AlertType =
  | 'EFECTIVO_ALTO'
  | 'EXTRANJERO_EFECTIVO_ALTO'
  | 'RIESGO_ALTO'
  | 'DATOS_INCOMPLETOS'
  | 'USO_TERCEROS';

export interface AlertSeed {
  type: AlertType;
  description: string;
}

export interface RiskEvaluationResult {
  riskLevel: RiskLevel;
  score: number;
  alerts: AlertSeed[];
}

export interface RiskInput {
  nationalityId: number;
  economicActivityId: number;
  fundOriginId: number;
  estimatedMonthlyAmount: number;
}

// Thresholds (could also be loaded from a config table in the DB)
const CASH_ALERT_THRESHOLD = 2_000_000;
const HIGH_AMOUNT_THRESHOLD = 5_000_000;
const SCORE_ALTO = 8;
const SCORE_MEDIO = 4;

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates the risk level for a client registration and determines which
   * alerts must be generated.
   *
   * Score composition:
   *   +3  foreign nationality
   *   +W  economic activity risk_weight  (0–10)
   *   +W  fund origin risk_weight        (0–10)
   *   +3  estimated_monthly_amount > 5 M
   *   +4  cash payment AND amount > 2 M
   *
   * Thresholds:  score ≥ 8 → ALTO | score ≥ 4 → MEDIO | else → BAJO
   */
  async evaluate(input: RiskInput): Promise<RiskEvaluationResult> {
    const [nationality, economicActivity, fundOrigin] = await Promise.all([
      this.prisma.nationality.findUniqueOrThrow({
        where: { id: input.nationalityId },
      }),
      this.prisma.economicActivity.findUniqueOrThrow({
        where: { id: input.economicActivityId },
      }),
      this.prisma.fundOrigin.findUniqueOrThrow({
        where: { id: input.fundOriginId },
      }),
    ]);

    let score = 0;
    const alerts: AlertSeed[] = [];
    const amount = Number(input.estimatedMonthlyAmount);

    // Nationality contribution
    if (nationality.is_foreign) score += 3;

    // Catalog weights
    score += economicActivity.risk_weight;
    score += fundOrigin.risk_weight;

    // High amount
    if (amount > HIGH_AMOUNT_THRESHOLD) score += 3;

    // Cash payment above threshold
    const isCashHigh = fundOrigin.is_cash && amount > CASH_ALERT_THRESHOLD;
    if (isCashHigh) {
      score += 4;
      alerts.push({
        type: 'EFECTIVO_ALTO',
        description: `Pago en efectivo de ${this.fmt(amount)}, supera el umbral de ${this.fmt(CASH_ALERT_THRESHOLD)}.`,
      });
    }

    // Foreign + high cash → highest risk signal
    if (nationality.is_foreign && isCashHigh) {
      alerts.push({
        type: 'EXTRANJERO_EFECTIVO_ALTO',
        description: `Cliente de nacionalidad ${nationality.name} realiza pagos en efectivo de alto valor.`,
      });
    }

    // Third-party funds
    if (fundOrigin.name.toLowerCase().includes('terceros')) {
      alerts.push({
        type: 'USO_TERCEROS',
        description: `Origen de fondos declarado sugiere uso de terceros: "${fundOrigin.name}".`,
      });
    }

    const riskLevel = this.toRiskLevel(score);

    if (riskLevel === 'ALTO') {
      alerts.push({
        type: 'RIESGO_ALTO',
        description: `Perfil clasificado como ALTO (puntaje ${score}). Requiere revisión manual.`,
      });
    }

    return { riskLevel, score, alerts };
  }

  private toRiskLevel(score: number): RiskLevel {
    if (score >= SCORE_ALTO) return 'ALTO';
    if (score >= SCORE_MEDIO) return 'MEDIO';
    return 'BAJO';
  }

  private fmt(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
