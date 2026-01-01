/**
 * LiveKit Room Component - Re-export
 * 
 * This file is here as a fallback. Metro/Webpack should automatically
 * choose LiveKitRoom.native.tsx or LiveKitRoom.web.tsx based on platform.
 * 
 * If this file is being used, something might be wrong with the bundler config.
 */

// This export will be overridden by platform-specific files
export { default, LiveKitRoom } from './LiveKitRoom.native';

