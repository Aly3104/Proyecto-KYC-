import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../better-auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const sessionData = await auth.api
      .getSession({ headers: fromNodeHeaders(request.headers) })
      .catch(() => null);

    if (!sessionData) {
      throw new UnauthorizedException('Sesión no válida o expirada');
    }

    // Attach typed session data to the request for downstream decorators
    (request as Request & { user: unknown; session: unknown }).user =
      sessionData.user;
    (request as Request & { user: unknown; session: unknown }).session =
      sessionData.session;

    return true;
  }
}
