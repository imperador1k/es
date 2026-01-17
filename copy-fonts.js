const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
const dest = path.join(__dirname, 'dist/assets/fonts');

// Ensure destination exists
if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
}

// Copy Ionicons
const fonts = ['Ionicons.ttf', 'FontAwesome.ttf', 'MaterialIcons.ttf'];

fonts.forEach(font => {
    const srcFile = path.join(src, font);
    const destFile = path.join(dest, font);
    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`✅ Copied ${font} to dist/assets/fonts`);
    } else {
        console.warn(`⚠️ Could not find ${font} in ${src}`);
    }
});
