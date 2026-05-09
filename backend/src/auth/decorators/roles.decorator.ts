import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more roles. Must be used together with RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
