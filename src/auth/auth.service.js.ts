import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private users = []; // replace with real DB later

  constructor(private jwtService: JwtService) {}

  async signup(dto: SignupDto) {
    const existing = this.users.find(u => u.email === dto.email);
    
    if (existing) throw new UnauthorizedException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = { id: this.users.length + 1, ...dto, password: hashedPassword };
    this.users.push(user);
    return { message: 'Signup successful' };
  }

  async login(dto: LoginDto) {
    const user = this.users.find(u => u.email === dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
