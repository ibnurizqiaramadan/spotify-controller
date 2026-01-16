import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Ensure logs directory exists
// In Next.js, process.cwd() returns the project root
const logsDir = join(process.cwd(), 'logs');

// Initialize logs directory
let logsDirInitialized = false;
const ensureLogsDir = async () => {
  if (!logsDirInitialized) {
    try {
      await mkdir(logsDir, { recursive: true });
      logsDirInitialized = true;
    } catch (error) {
      // Directory might already exist, ignore error
      logsDirInitialized = true;
    }
  }
};

// Get log file name based on current date
const getLogFileName = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `auth-${year}-${month}-${day}.log`;
};

// Write log to file (async, non-blocking)
const writeToFile = async (logEntry: string) => {
  try {
    await ensureLogsDir();
    const logFile = join(logsDir, getLogFileName());
    await appendFile(logFile, logEntry + '\n', 'utf-8');
  } catch (error) {
    // Don't throw error, just log to console if file write fails
    console.error('[LOGGER] Failed to write to log file:', error);
  }
};

// Create log entry
const createLogEntry = (level: string, service: string, message: string, data?: any) => {
  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(data && { data })
  };
};

// Log function for info level
export const logAuth = async (message: string, data?: any) => {
  const logEntry = createLogEntry('info', 'auth', message, data);
  const logString = JSON.stringify(logEntry);
  
  // Write to console (for Open Runtime compatibility)
  console.log(logString);
  
  // Write to file (async, non-blocking)
  writeToFile(logString).catch(() => {
    // Silently fail if file write fails
  });
};

// Log function for error level
export const logAuthError = async (message: string, error?: any) => {
  const logEntry = createLogEntry('error', 'auth', message, {
    ...(error && {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    })
  });
  const logString = JSON.stringify(logEntry);
  
  // Write to console (for Open Runtime compatibility)
  console.error(logString);
  
  // Write to file (async, non-blocking)
  writeToFile(logString).catch(() => {
    // Silently fail if file write fails
  });
};
