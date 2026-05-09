import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns nationalities sorted: local first, then alphabetically. */
  getNationalities() {
    return this.prisma.nationality.findMany({
      orderBy: [{ is_foreign: 'asc' }, { name: 'asc' }],
    });
  }

  getEconomicActivities() {
    return this.prisma.economicActivity.findMany({
      orderBy: { name: 'asc' },
    });
  }

  getFundOrigins() {
    return this.prisma.fundOrigin.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
