import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { RiskModule } from '../risk/risk.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [RiskModule, AlertsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
