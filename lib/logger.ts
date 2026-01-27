/**
 * Industry-grade structured logger.
 * In a real production environment, this would integrate with Sentry, Datadog, or LogRocket.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

const formatLog = (level: LogLevel, message: string, context?: LogContext) => {
  const timestamp = new Date().toISOString();
  // Safe stringify for context
  const contextStr = context ? JSON.stringify(context) : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
};

export const logger = {
  info: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`%c INFO`, 'background: #22c55e; color: #fff; padding: 2px 4px; rounded: 2px', message, context || '');
    } else {
      console.info(formatLog('info', message, context));
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV !== 'production') {
       console.warn(`%c WARN`, 'background: #f59e0b; color: #fff; padding: 2px 4px; rounded: 2px', message, context || '');
    } else {
       console.warn(formatLog('warn', message, context));
    }
  },

  error: (message: string, error?: any, context?: LogContext) => {
    // Always log errors prominently
    console.error(formatLog('error', message, { ...context, error: error?.message || error }));
    if (error?.stack) console.error(error.stack);
  },

  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`%c DEBUG`, 'background: #3b82f6; color: #fff; padding: 2px 4px; rounded: 2px', message, context || '');
    }
  }
};