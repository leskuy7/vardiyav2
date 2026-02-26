import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ShiftsModule } from './shifts/shifts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 120)
      }]
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ScheduleModule,
    ShiftsModule,
    AvailabilityModule,
    EmployeesModule,
    ReportsModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule { }
