import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActiveUser } from '../auth/better-auth';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  /**
   * GET /alerts?resolved=true|false
   * Omit query param to retrieve all alerts.
   */
  @Get()
  findAll(@Query('resolved') resolved?: string) {
    const filter =
      resolved === 'true'
        ? true
        : resolved === 'false'
          ? false
          : undefined;
    return this.alerts.findAll(filter);
  }

  /**
   * PATCH /alerts/:id/resolve
   * Admin-only. Marks the alert as resolved.
   */
  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  resolve(@Param('id') id: string, @CurrentUser() user: ActiveUser) {
    return this.alerts.resolve(id, user.id, user.role as string);
  }
}
