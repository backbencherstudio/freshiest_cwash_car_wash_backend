import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
} from '@nestjs/common';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle JSON parsing errors specifically
    if (exception instanceof BadRequestException) {
      const message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any)?.message;

      if (message && message.includes('Bad control character')) {
        return response.status(status).json({
          success: false,
          message: {
            message: 'Invalid JSON format. Please check for unescaped characters like newlines or tabs in your data.',
            error: 'Bad Request',
            statusCode: 400,
            hint: 'Make sure all string values are properly escaped and don\'t contain newlines or special characters.'
          },
        });
      }
    }

    // Return custom error response format
    response.status(status).json({
      success: false,
      message: exceptionResponse,
    });
  }
}
