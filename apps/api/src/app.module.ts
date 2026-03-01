import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';
import { ReportsModule } from './reports/reports.module';
import { ScheduleModule } from './schedule/schedule.module';
import { SecurityModule } from './security/security.module';
import { ShiftsModule } from './shifts/shifts.module';
import { SwapRequestsModule } from './swap-requests/swap-requests.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';
import { LeaveBalancesModule } from './leave-balances/leave-balances.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { OvertimeModule } from './overtime/overtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: Number(config.get('THROTTLE_TTL') ?? 60000),
        limit: Number(config.get('THROTTLE_LIMIT') ?? 120)
      }]
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ScheduleModule,
    ShiftsModule,
    AvailabilityModule,
    EmployeesModule,
    MetaModule,
    SecurityModule,
    ReportsModule,
    SwapRequestsModule,
    LeaveRequestsModule,
    LeaveTypesModule,
    LeaveBalancesModule,
    TimeEntriesModule,
    OvertimeModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule { }
