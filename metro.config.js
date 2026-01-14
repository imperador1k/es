const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Alias react-native-reanimated to our mock on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-reanimated') {
        return {
            filePath: path.resolve(__dirname, 'lib/reanimated.web.ts'),
            type: 'sourceFile',
        };
    }
    // Alias react-native-copilot to our mock on web (prevents SvgMask crash)
    if (platform === 'web' && moduleName === 'react-native-copilot') {
        return {
            filePath: path.resolve(__dirname, 'lib/copilot.web.tsx'),
            type: 'sourceFile',
        };
    }
    // Fall back to the default resolver
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });