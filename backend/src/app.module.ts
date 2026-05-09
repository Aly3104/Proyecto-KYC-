import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { AlertsModule } from './alerts/alerts.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { RiskModule } from './risk/risk.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    AlertsModule,
    CatalogsModule,
    RiskModule,
  ],
})
export class AppModule {}
