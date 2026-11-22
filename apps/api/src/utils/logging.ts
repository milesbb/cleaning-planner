type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, string | number | boolean>;

interface Logger {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger: Logger = {
  info: (message, context) => {
    write('info', message, context);
  },
  warn: (message, context) => {
    write('warn', message, context);
  },
  error: (message, context) => {
    write('error', message, context);
  },
};
