import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const payload = typeof exceptionResponse === 'object' && exceptionResponse !== null ? exceptionResponse : {};
    const isServerError = status >= 500;

    if (isServerError) {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      code: (payload as { code?: string }).code ?? (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR'),
      message: isServerError ? 'Unexpected error' : (payload as { message?: string }).message ?? 'Unexpected error',
      details: isServerError ? {} : payload,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
}
