import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ActiveUser } from '../better-auth';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles decorator → any authenticated user can proceed
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = (
      context.switchToHttp().getRequest<Request>() as Request & {
        user?: ActiveUser;
      }
    ).user;

    if (!user?.role || !requiredRoles.includes(user.role as string)) {
      throw new ForbiddenException(
        `Acceso denegado. Rol requerido: ${requiredRoles.join(' | ')}`,
      );
    }

    return true;
  }
}
