export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  source?: string;
}

export abstract class LoggerService {
  abstract log(level: LogLevel, message: string, data?: any, source?: string): void;
  abstract debug(message: string, data?: any, source?: string): void;
  abstract info(message: string, data?: any, source?: string): void;
  abstract warn(message: string, data?: any, source?: string): void;
  abstract error(message: string, data?: any, source?: string): void;
}
