// ============================================
// SNE RADAR - LOGGER v2.2
// Sistema de logging estruturado
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  timestamp: string
  context?: string
}

class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: this.context
    }

    // Console logging based on environment
    if (import.meta.env.DEV || level === 'error') {
      const prefix = this.context ? `[${this.context}]` : '[SNE]'
      const logMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'

      console[logMethod](`${prefix} ${message}`, data || '')
    }

    // In production, send to monitoring service
    if (import.meta.env.PROD && (level === 'error' || level === 'warn')) {
      this.sendToMonitoring(entry)
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log('error', message, data)
  }

  // Create child logger with specific context
  child(context: string): Logger {
    return new Logger(`${this.context || 'SNE'}:${context}`)
  }

  private sendToMonitoring(_entry: LogEntry) {
    // TODO: Implement monitoring service integration
    // Example: Sentry, LogRocket, or custom monitoring
    try {
      // Placeholder for monitoring service
      // sendToMonitoringService(entry)
    } catch (error) {
      // Fallback to console if monitoring fails
      console.error('Failed to send log to monitoring:', error)
    }
  }
}

// Create default logger instance
export const logger = new Logger()

// Export Logger class for creating contextual loggers
export { Logger }
export type { LogLevel, LogEntry }
