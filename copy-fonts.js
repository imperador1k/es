const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
// Destinos múltiplos para garantir que o Expo/Web encontra
const destinations = [
    path.join(__dirname, 'dist/assets/fonts'),
    path.join(__dirname, 'dist/fonts'),
    path.join(__dirname, 'dist/assets') // Alguns setups procuram aqui
];

// Ensure destinations exist
destinations.forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

// Copy Fonts
const fonts = ['Ionicons.ttf', 'FontAwesome.ttf', 'MaterialIcons.ttf', 'MaterialCommunityIcons.ttf', 'Entypo.ttf', 'AntDesign.ttf'];

fonts.forEach(font => {
    const srcFile = path.join(src, font);
    if (fs.existsSync(srcFile)) {
        destinations.forEach(destDir => {
            fs.copyFileSync(srcFile, path.join(destDir, font));
        });
        console.log(`✅ Copied ${font} to built locations`);
    } else {
        console.warn(`⚠️ Could not find ${font} in ${src}`);
    }
});

// Função para encontrar ficheiros recursivamente
function findFiles(dir, ext, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, ext, fileList);
        } else {
            if (path.extname(file) === ext) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

// 2. CORREÇÃO "FLATTEN": Encontrar os ficheiros com hash (ex: Ionicons.b4e...ttf) que o Metro gerou
// e trazê-los para a raiz dos assets.
const distAssets = path.join(__dirname, 'dist/assets');
console.log('🔍 Procurando fontes geradas (hashed) em:', distAssets);

const hashedFonts = findFiles(distAssets, '.ttf');

if (hashedFonts.length > 0) {
    console.log(`📦 Encontradas ${hashedFonts.length} fontes hashed. A copiar para raízes...`);
    hashedFonts.forEach(srcPath => {
        const fileName = path.basename(srcPath);
        destinations.forEach(destDir => {
            const destPath = path.join(destDir, fileName);
            // Evita copiar sobre si mesmo
            if (path.normalize(srcPath) !== path.normalize(destPath)) {
                try {
                    fs.copyFileSync(srcPath, destPath);
                } catch (e) { }
            }
        });
        console.log(`   -> ${fileName}`);
    });
} else {
    console.warn('⚠️ Nenhuma fonte hashed encontrada em dist/assets.');
}

console.log('✅ Fix de ícones concluído!');
