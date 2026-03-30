import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyResetTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
