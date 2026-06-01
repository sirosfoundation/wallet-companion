import { Logger } from '@sirosfoundation/browser-log';


// TODO: This should be configurable to different build targets (e.g. 'debug' for development, 'info' for production)
export const logger = new Logger({ level: 'debug' });
