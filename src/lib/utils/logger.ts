type LogLevel = 'log' | 'info' | 'warn' | 'error';

interface LogOptions {
	emoji?: string;
	background?: string;
	color?: string;
}

interface LogStyles {
	browser: {
		namespace: string;
		timestamp: string;
		message: string;
	};
	terminal: {
		timestamp: string;
		reset: string;
		log: string;
		info: string;
		warn: string;
		error: string;
	};
}

const logLevels: Record<LogLevel, LogOptions> = {
	log: { emoji: '📝', background: '#4a90e2', color: '#ffffff' },
	info: { emoji: 'ℹ️', background: '#3498db', color: '#ffffff' },
	warn: { emoji: '⚠️', background: '#f39c12', color: '#000000' },
	error: { emoji: '❌', background: '#e74c3c', color: '#ffffff' }
};

const isBrowser = typeof window !== 'undefined';

const createLogger = (namespace: string, options: LogOptions = {}) => {
	const formatMessage = (level: LogLevel, ...args: unknown[]) => {
		const { emoji, background, color } = { ...logLevels[level], ...options };
		const timestamp = new Date().toLocaleString('pl-PL', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZone: 'Europe/Warsaw'
		});

		if (isBrowser) {
			const namespaceStyle = `background: ${background}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: bold;`;
			const messageStyle = 'background: none; color: inherit;';

			return [
				`%c[${timestamp}] %c${namespace}${emoji ? ` ${emoji}` : ''}%c`,
				'color: #888;',
				namespaceStyle,
				messageStyle,
				...args
			];
		} else {
			// ANSI color codes for terminal
			const styles: LogStyles['terminal'] = {
				timestamp: '\x1b[90m', // gray
				reset: '\x1b[0m',
				log: '\x1b[34m', // blue
				info: '\x1b[36m', // cyan
				warn: '\x1b[33m', // yellow
				error: '\x1b[31m' // red
			};

			const levelColor = styles[level] || '';
			const formattedNamespace = `${levelColor}[${namespace}]${emoji ? ` ${emoji}` : ''}${styles.reset}`;
			const formattedTimestamp = `${styles.timestamp}[${timestamp}]${styles.reset}`;

			// Return plain array for console methods to handle
			return [`${formattedTimestamp} ${formattedNamespace}`, ...args];
		}
	};

	return {
		log: (...args: unknown[]) => console.log(...formatMessage('log', ...args)),
		info: (...args: unknown[]) => console.info(...formatMessage('info', ...args)),
		warn: (...args: unknown[]) => console.warn(...formatMessage('warn', ...args)),
		error: (...args: unknown[]) => console.error(...formatMessage('error', ...args))
	};
};

export const logger = createLogger('SCRAPPER', { emoji: '🕷️' });
export const cronLogger = createLogger('CRON', { emoji: '⏰' });
export const dbLogger = createLogger('DATABASE', { emoji: '💾' });

export default createLogger;
