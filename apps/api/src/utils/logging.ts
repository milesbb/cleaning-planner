type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, string | number | boolean>;
type LogFunction = (message: string, context?: LogContext) => void;

type Logger = Record<LogLevel, LogFunction>;

function writeLogLine(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...context });
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

function logAt(level: LogLevel): LogFunction {
  return (message, context) => {
    writeLogLine(level, message, context);
  };
}

export const logger: Logger = {
  info: logAt('info'),
  warn: logAt('warn'),
  error: logAt('error'),
};
