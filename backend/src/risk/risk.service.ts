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

const CASH_ALERT_THRESHOLD = 2_000_000;
const HIGH_AMOUNT_THRESHOLD = 5_000_000;
const SCORE_ALTO = 8;
const SCORE_MEDIO = 4;

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

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

    const economicName = economicActivity.name.toLowerCase();
    const fundOriginName = fundOrigin.name.toLowerCase();

    if (nationality.is_foreign) score += 3;

    score += economicActivity.risk_weight;
    score += fundOrigin.risk_weight;

    if (amount > HIGH_AMOUNT_THRESHOLD) score += 3;

    const isCashHigh = fundOrigin.is_cash && amount > CASH_ALERT_THRESHOLD;
    if (isCashHigh) {
      score += 4;
      alerts.push({
        type: 'EFECTIVO_ALTO',
        description: `Pago en efectivo de ${this.fmt(amount)}, supera el umbral de ${this.fmt(CASH_ALERT_THRESHOLD)}.`,
      });
    }

    if (nationality.is_foreign && isCashHigh) {
      alerts.push({
        type: 'EXTRANJERO_EFECTIVO_ALTO',
        description: `Cliente de nacionalidad ${nationality.name} realiza pagos en efectivo de alto valor.`,
      });
    }

    if (fundOriginName.includes('terceros')) {
      alerts.push({
        type: 'USO_TERCEROS',
        description: `Origen de fondos declarado sugiere uso de terceros: "${fundOrigin.name}".`,
      });
    }

    const hasIncompleteData =
      economicName.includes('no declarada') ||
      fundOriginName.includes('no declarado');

    if (hasIncompleteData) {
      alerts.push({
        type: 'DATOS_INCOMPLETOS',
        description:
          'El cliente presenta información incompleta o no declarada en los datos KYC.',
      });

      if (score < SCORE_ALTO) {
        score = SCORE_ALTO;
      }
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
