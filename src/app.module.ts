import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // <--- Import this
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Connect to your local MongoDB
    // 'nest_auth_db' is the name of the database (it will be created automatically if it doesn't exist)
    MongooseModule.forRoot('mongodb://localhost:27017/nest_auth_db'), 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}