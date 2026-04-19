import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = extractMessage(exception);

    const flatMessage = Array.isArray(message) ? message.join('; ') : message;
    this.logger.error(
      `${request.method} ${request.url} → ${status} — ${flatMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ErrorBody = { statusCode: status, message };
    response.status(status).json(body);
  }
}

function extractMessage(exception: unknown): string | string[] {
  if (!(exception instanceof HttpException)) {
    return 'Internal server error';
  }

  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  if (response && typeof response === 'object' && 'message' in response) {
    const candidate = (response as { message: unknown }).message;
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (Array.isArray(candidate) && candidate.every((m) => typeof m === 'string')) {
      return candidate;
    }
  }

  return exception.message;
}
