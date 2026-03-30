import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtGuard } from './guard';
import { GetUser } from './decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}
    
    @HttpCode(HttpStatus.OK)
    @Post('signin')
    signIn(@Body() authDto: AuthDto) {
        return this.authService.signIn(authDto);
    }

    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    @Post('signout')
    signOut(@GetUser('id') userId: number) {
        return this.authService.signOut(userId);
    }

    @HttpCode(HttpStatus.OK)
    @Post('forgot-password')
    forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('verify-reset-token')
    verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
        return this.authService.verifyResetToken(verifyResetTokenDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('reset-password')
    resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(resetPasswordDto);
    }
}
