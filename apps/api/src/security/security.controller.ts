import { Body, Controller, Headers, HttpCode, Ip, Post } from '@nestjs/common';
import { SecurityService } from './security.service';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('csp-report')
  @HttpCode(204)
  async cspReport(
    @Body() body: unknown,
    @Ip() ip: string,
    @Headers('x-csp-report-token') token?: string
  ) {
    const expectedToken = process.env.CSP_REPORT_TOKEN;

    if (expectedToken && token !== expectedToken) {
      return;
    }

    await this.securityService.ingestCspReport(body, ip);
  }
}
