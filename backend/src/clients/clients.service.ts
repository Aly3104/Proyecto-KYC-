import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { RiskService } from '../risk/risk.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateClientDto } from './dto/create-client.dto';

const CLIENT_INCLUDE = {
  nationality: true,
  economicActivity: true,
  fundOrigin: true,
  creator: {
    select: { id: true, name: true, email: true, role: true },
  },
} as const;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly risk: RiskService,
    private readonly alerts: AlertsService,
  ) {}

  async create(dto: CreateClientDto, createdBy: string) {
    const existing = await this.prisma.client.findUnique({
      where: { identification: dto.identification },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un cliente con la identificación "${dto.identification}"`,
      );
    }

    // Risk evaluation must happen before persisting so the risk_level is saved
    const evaluation = await this.risk.evaluate({
      nationalityId: dto.nationalityId,
      economicActivityId: dto.economicActivityId,
      fundOriginId: dto.fundOriginId,
      estimatedMonthlyAmount: dto.estimatedMonthlyAmount,
    });

    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        full_name: dto.fullName,
        identification: dto.identification,
        nationality_id: dto.nationalityId,
        economic_activity_id: dto.economicActivityId,
        fund_origin_id: dto.fundOriginId,
        estimated_monthly_amount: dto.estimatedMonthlyAmount,
        risk_level: evaluation.riskLevel,
        created_by: createdBy,
      },
      include: {
        ...CLIENT_INCLUDE,
        alerts: true,
      },
    });

    // Persist generated alerts (fire-and-forget, errors are non-blocking)
    if (evaluation.alerts.length > 0) {
      await this.alerts.createMany(client.id, evaluation.alerts);
    }

    return {
      ...client,
      riskScore: evaluation.score,
      alertsGenerated: evaluation.alerts.length,
    };
  }

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        ...CLIENT_INCLUDE,
        alerts: {
          where: { is_resolved: false },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ...CLIENT_INCLUDE,
        alerts: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado`);
    }

    return client;
  }
}
