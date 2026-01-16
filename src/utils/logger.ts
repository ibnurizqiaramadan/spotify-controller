// Discord webhook URL from environment
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

// Log Discord webhook status at module load
if (DISCORD_WEBHOOK_URL) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'logger',
    message: 'Discord webhook configured',
    data: { webhookUrl: DISCORD_WEBHOOK_URL.substring(0, 30) + '...' }
  }));
} else {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    service: 'logger',
    message: 'Discord webhook not configured - logs will only go to console',
    data: { envVar: 'DISCORD_WEBHOOK' }
  }));
}

// Send log to Discord webhook (async, non-blocking)
const sendToDiscord = async (level: string, message: string, data?: any, error?: any) => {
  if (!DISCORD_WEBHOOK_URL) {
    return; // Silently skip if webhook not configured
  }

  try {
    const color = level === 'error' ? 0xff0000 : 0x00ff00; // Red for error, green for info
    
    // Format data for Discord embed
    let description = `**${message}**`;
    
    if (data && Object.keys(data).length > 0) {
      const dataStr = JSON.stringify(data, null, 2);
      // Discord embed description has 4096 char limit, truncate if needed
      if (dataStr.length > 3500) {
        description += `\n\`\`\`json\n${dataStr.substring(0, 3500)}...\n\`\`\``;
      } else {
        description += `\n\`\`\`json\n${dataStr}\n\`\`\``;
      }
    }

    if (error) {
      const errorStr = error instanceof Error 
        ? `${error.name}: ${error.message}\n\`\`\`${error.stack?.substring(0, 1000) || 'No stack trace'}\`\`\``
        : JSON.stringify(error, null, 2);
      description += `\n\n**Error:**\n${errorStr}`;
    }

    const embed = {
      title: `🔐 Auth ${level.toUpperCase()}`,
      description: description.substring(0, 4096), // Discord limit
      color: color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Spotify Bot Auth Logger'
      }
    };

    const payload = {
      embeds: [embed]
    };

    // Send to Discord webhook (non-blocking, fire and forget)
    // Use global fetch (available in Node.js 18+ and Next.js)
    if (typeof fetch !== 'undefined') {
      fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail if webhook fails
      });
    }
  } catch (error) {
    // Silently fail if webhook fails
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
  
  // Send to Discord webhook (async, non-blocking)
  sendToDiscord('info', message, data).catch(() => {
    // Silently fail if webhook fails
  });
};

// Log function for error level
export const logAuthError = async (message: string, error?: any) => {
  const errorData = error instanceof Error ? {
    message: error.message,
    name: error.name,
    stack: error.stack
  } : error;

  const logEntry = createLogEntry('error', 'auth', message, {
    ...(errorData && { error: errorData })
  });
  const logString = JSON.stringify(logEntry);
  
  // Write to console (for Open Runtime compatibility)
  console.error(logString);
  
  // Send to Discord webhook (async, non-blocking)
  sendToDiscord('error', message, undefined, error).catch(() => {
    // Silently fail if webhook fails
  });
};
