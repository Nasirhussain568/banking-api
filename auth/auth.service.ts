import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';


@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly mailService: MailService,
        
    ) {}

    async signIn(authDto: AuthDto) {
        // find the user by email
        const user = await this.prisma.user.findUnique({
            where: {
                email: authDto.email,
            },
        });

        if (!user || user.isDeleted)
            throw new ForbiddenException('Credentials incorrect');
    
        const pwMatches = await argon2.verify(
            user.password,
            authDto.password,
        );
        
        if (!pwMatches)
            throw new ForbiddenException('Credentials incorrect');
            
        // Generate token
        const token = await this.signToken(user.id, user.email);

        // Return complete user object with token
        const { password, ...userWithoutPassword } = user;

        return {
            success: true,
            message: 'Login successful',
            data: {
                ...userWithoutPassword,
                auth_token: token.data.user.auth_token,
            }
        };
    }

    async signToken(
        userId: number,
        email: string,
    ): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: number;
                email: string;
                auth_token: string;
                user_type: string;
            }
        }
    }> {
        const payload = {
            sub: userId,
            email,
        };
        const secret = this.config.get('JWT_SECRET');

        const token = await this.jwtService.signAsync(
            payload,
            {
                // No expiration time set - token will never expire
                secret: secret,
            },
        );

        // Update user with the new auth_token
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { auth_token: token },
            select: {
                id: true,
                email: true,
                userType: true,
            },
        });

        return {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    auth_token: token,
                    user_type: user.userType
                }
            }
        };
    }

    async signOut(userId: number): Promise<{ success: boolean; message: string }> {
        await this.prisma.user.update({
          where: { id: userId },
          data: { auth_token: null },
        });
        return { 
            success: true,
            message: 'Logout successful'
        };
    }

    async forgotPassword(authDto: ForgotPasswordDto) {
      const user = await this.prisma.user.findUnique({
        where: { 
          email: authDto.email
        }
      });

      if (!user) {
        throw new ForbiddenException('Email not found.');
      }

      const resetToken = this.generatePasswordResetToken();
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordTokenExpiry: new Date(Date.now() + 3600000) // 1 hour expiry
        }
      });

      // TODO: Send email with resetToken
     try {
        this.mailService.sendPasswordResetEmail(user.email, resetToken);
        return { success: true, message: 'Password reset instruction sent to your email.' };
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        return { success: false, message: 'If your email is registered, you will receive password reset instructions.' };
      }
    }
    

    async verifyResetToken(verifyResetTokenDto: VerifyResetTokenDto): Promise<{ success: boolean; message: string; email?: string }> {
      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: verifyResetTokenDto.token,
        },
      });

      if (!user) {
        throw new ForbiddenException('Invalid or expired reset token.');
      }

      if (!this.isPasswordTokenExpiryValid(user)) {
        throw new ForbiddenException('Invalid or expired reset token.');
      }

      return { 
        success: true, 
        message: 'Token is valid.',
        email: user.email
      };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
      const { token, password, password_confirmation } = resetPasswordDto;

      const user = await this.prisma.user.findFirst({
        where: { resetPasswordToken: token },
      });

      if (!user) {
        throw new ForbiddenException('Invalid or expired reset token.');
      }

      if (!this.isPasswordTokenExpiryValid(user)) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordToken: null,
            resetPasswordTokenExpiry: null,
          },
        });
        throw new ForbiddenException('Invalid or expired reset token.');
      }

      if (password !== password_confirmation) {
        throw new ForbiddenException('Passwords do not match.');
      }

      const hashedPassword = await argon2.hash(password);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordTokenExpiry: null,
        },
      });

      return { success: true, message: 'Password has been reset successfully.' };
    }

    private generatePasswordResetToken(): string {
      return crypto.randomBytes(32).toString('hex');
    }

    private isPasswordTokenExpiryValid(user: any): boolean {
      return user.resetPasswordTokenExpiry && 
        new Date(user.resetPasswordTokenExpiry) > new Date();
    }
}
