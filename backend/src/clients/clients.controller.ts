import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActiveUser } from '../auth/better-auth';

@Controller('clients')
@UseGuards(AuthGuard)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  /** POST /clients — Register a new KYC client */
  @Post()
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: ActiveUser,
  ) {
    return this.clients.create(dto, user.id);
  }

  /** GET /clients — List all clients with their active alerts */
  @Get()
  findAll() {
    return this.clients.findAll();
  }

  /** GET /clients/:id — Client detail with full alert history */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clients.findOne(id);
  }
}
