type LogLevel = 'info' | 'warn' | 'error';
type LogValue = string | number | boolean;
type LogContext = Record<string, LogValue>;
type LogFunction = (message: string, context?: LogContext) => void;

type Logger = Record<LogLevel, LogFunction>;

const REDACTED = '[redacted]';
const SECRET_FIELD = /email|token|authori[sz]ation|password|secret|cookie|invite|^code$/i;
const EMAIL_ADDRESS = /[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g;
const JSON_WEB_TOKEN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

function redactValue(field: string, value: LogValue): LogValue {
  if (SECRET_FIELD.test(field)) return REDACTED;
  if (typeof value !== 'string') return value;
  return value
    .replace(JSON_WEB_TOKEN, '[redacted token]')
    .replace(EMAIL_ADDRESS, '[redacted email]');
}

function redact(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([field, value]) => [field, redactValue(field, value)]),
  );
}

function writeLogLine(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...redact(context),
  });
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
