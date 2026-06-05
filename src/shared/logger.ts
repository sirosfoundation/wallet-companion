import { Logger } from '@sirosfoundation/browser-log';

export const logger = new Logger({ level: import.meta.env.VITE_LOG_LEVEL });
