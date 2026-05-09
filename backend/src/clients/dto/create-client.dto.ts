import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClientDto {
  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsNotEmpty({ message: 'La identificación es requerida' })
  @IsString()
  @MaxLength(50)
  identification: string;

  @IsInt({ message: 'nationalityId debe ser un número entero' })
  @IsPositive()
  @Type(() => Number)
  nationalityId: number;

  @IsInt({ message: 'economicActivityId debe ser un número entero' })
  @IsPositive()
  @Type(() => Number)
  economicActivityId: number;

  @IsInt({ message: 'fundOriginId debe ser un número entero' })
  @IsPositive()
  @Type(() => Number)
  fundOriginId: number;

  @IsNumber({}, { message: 'El monto estimado mensual debe ser un número' })
  @Min(0, { message: 'El monto estimado mensual no puede ser negativo' })
  @Type(() => Number)
  estimatedMonthlyAmount: number;
}
