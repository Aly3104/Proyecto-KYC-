import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ActiveUser } from '../better-auth';

/** Extracts the authenticated user from the request object. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveUser => {
    const request = ctx.switchToHttp().getRequest<
      Request & { user: ActiveUser }
    >();
    return request.user;
  },
);
