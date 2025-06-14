import { Injectable, inject, isDevMode } from '@angular/core';
import { LogLevel, LogEntry, LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class ConsoleLoggerService extends LoggerService {
  private readonly logLevel: LogLevel = isDevMode() ? LogLevel.DEBUG : LogLevel.WARN;

  log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      source
    };

    this.writeToConsole(logEntry);
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const source = entry.source ? `[${entry.source}]` : '';
    const logMessage = `${timestamp} ${source} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug('🐛', logMessage, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info('ℹ️', logMessage, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn('⚠️', logMessage, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error('❌', logMessage, entry.data || '');
        break;
    }
  }
}
