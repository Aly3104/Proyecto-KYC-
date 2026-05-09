import { Controller, Get, UseGuards } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('catalogs')
@UseGuards(AuthGuard)
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get('nationalities')
  getNationalities() {
    return this.catalogs.getNationalities();
  }

  @Get('economic-activities')
  getEconomicActivities() {
    return this.catalogs.getEconomicActivities();
  }

  @Get('fund-origins')
  getFundOrigins() {
    return this.catalogs.getFundOrigins();
  }
}
