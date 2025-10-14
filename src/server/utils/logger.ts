export type LogLevel = 'info' | 'warn' | 'error'

export interface LogMetadata {
  [key: string]: unknown
}

function emit(level: LogLevel, message: string, metadata?: LogMetadata) {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  if (metadata && Object.keys(metadata).length > 0) {
    payload.metadata = metadata
  }

  const serialized = JSON.stringify(payload)

  if (level === 'info') {
    console.log(serialized)
  } else if (level === 'warn') {
    console.warn(serialized)
  } else {
    console.error(serialized)
  }
}

export const logger = {
  info(message: string, metadata?: LogMetadata) {
    emit('info', message, metadata)
  },
  warn(message: string, metadata?: LogMetadata) {
    emit('warn', message, metadata)
  },
  error(message: string, metadata?: LogMetadata) {
    emit('error', message, metadata)
  },
}
