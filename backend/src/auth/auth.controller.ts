import { All, Controller, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './better-auth';

/**
 * Catch-all controller that hands every request under /auth/** to Better Auth.
 * Better Auth handles sign-up, sign-in, sign-out, get-session, etc. internally.
 */
@Controller('auth')
export class AuthController {
  private readonly handler = toNodeHandler(auth);

  @All('/*')
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.handler(req, res);
  }
}
