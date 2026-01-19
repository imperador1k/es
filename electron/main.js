/**
 * Electron Main Process - VERSÃO FINAL COM DEEP LINKING
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Correção de compatibilidade do serve
const serveLib = require('electron-serve');
const serve = serveLib.default || serveLib;

// Define o caminho absoluto para a pasta dist
const distDir = path.join(__dirname, '../dist');

// Configura o servidor de ficheiros estáticos
const loadURL = serve({ directory: distDir });

let mainWindow = null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Escola+',
        icon: path.join(__dirname, '../assets/images/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#0A0A0F',
        show: false, // Não mostrar até estar pronto
        autoHideMenuBar: true,
    });

    // Maximiza a janela ao abrir
    mainWindow.maximize();
    mainWindow.show();

    // 🔗 Interceptar links externos e abrir no browser padrão (Chrome/Edge)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' }; // Bloqueia a navegação dentro da Electron
        }
        return { action: 'allow' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        // Permitir navegação local (app) mas bloquear externas
        const isLocal = url.includes('localhost') || url.startsWith('file://') || url.includes('app://');
        if (!isLocal && (url.startsWith('http:') || url.startsWith('https:'))) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    Menu.setApplicationMenu(null);

    console.log('📂 A carregar app de:', distDir);

    try {
        await loadURL(mainWindow);
        console.log('✅ App carregada!');
    } catch (err) {
        console.error('❌ Erro ao carregar dist:', err);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- CONFIGURAÇÃO DEEP LINK (escolaa://) ---

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('escolaa', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('escolaa');
}

// Bloqueio de Instância Única (Para não abrir 2 janelas ao logar)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Se alguém tentar abrir uma segunda janela (ex: o browser a redirecionar o login)
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();

            // Encontra o URL mágico
            const url = commandLine.find(arg => arg.startsWith('escolaa://'));
            if (url) {
                console.log('🔗 Login recebido:', url);
                // Envia via IPC para o renderer
                mainWindow.webContents.send('deep-link', url);
            }
        }
    });

    // Só cria a janela se for a instância principal
    app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});