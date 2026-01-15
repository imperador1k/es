# 🚀 Como Atualizar a App Desktop (Windows)

Este guia serve para lançar uma nova versão do executável (.exe) e avisar automaticamente todos os utilizadores.

---

## Passo 1: Preparar a Nova Versão

1. Faz as alterações necessárias no código da App.
2. Abre o `package.json` e sobe o número da versão (ex: de `1.0.0` para `1.0.1`).
3. Abre o ficheiro `public/version.json` e atualiza:
   - `"version"`: Igual ao package.json (`1.0.1`).
   - `"changelog"`: Escreve o que mudou (novidades).
   - **NÃO** faças commit/push ainda (precisamos do link novo primeiro).

---

## Passo 2: Criar o Instalador

1. Garante que o ícone está correto (`assets/images/icon.ico`).
2. No terminal, corre:

```bash
npm run electron:build
```

3. Após terminar, o ficheiro `.exe` estará em:
   - `electron-build/Escola+ Setup X.X.X.exe`

---

## Passo 3: Upload para Google Drive

1. Faz upload do `.exe` para o Google Drive.
2. Click direito → **Obter link** → Muda para **"Qualquer pessoa com o link"**.
3. Copia o link de partilha.

> **Nota**: O link do Drive tem este formato:
> `https://drive.google.com/file/d/XXXX/view?usp=sharing`
>
> Para download direto, converte para:
> `https://drive.google.com/uc?export=download&id=XXXX`

---

## Passo 4: Atualizar a Página de Download

1. Abre `app/download.tsx`
2. Atualiza a constante `DOWNLOAD_LINK`:

```tsx
const DOWNLOAD_LINK = "https://drive.google.com/uc?export=download&id=SEU_ID_AQUI";
```

3. Atualiza também `APP_VERSION` se necessário:

```tsx
const APP_VERSION = "1.0.1";
```

---

## Passo 5: Deploy na Vercel

1. Faz commit de todas as alterações:

```bash
git add .
git commit -m "chore: release v1.0.1"
git push
```

2. A Vercel fará deploy automático.
3. Após o deploy, o `version.json` online terá a nova versão.

---

## ✅ Como Funciona o Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUXO DE UPDATE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User abre Electron App                                   │
│           ↓                                                  │
│  2. UpdateChecker busca version.json da Vercel               │
│           ↓                                                  │
│  3. Compara versão local vs remota                          │
│           ↓                                                  │
│  4. Se remota > local → Mostra modal de update              │
│           ↓                                                  │
│  5. Click "Baixar Agora" → Abre /download page              │
│           ↓                                                  │
│  6. Click no botão → Download do .exe do Google Drive       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Ficheiros Importantes

| Ficheiro | Propósito |
|----------|-----------|
| `public/version.json` | Versão atual hospedada na Vercel |
| `app/download.tsx` | Página de download com link do Drive |
| `components/UpdateChecker.tsx` | Componente que verifica updates |
| `electron/main.js` | Entry point do Electron |
| `package.json` | Versão da app + scripts de build |

---

## 🔧 Comandos Úteis

```bash
# Testar Electron localmente
npm run electron:dev

# Criar instalador Windows (.exe)
npm run electron:build

# O output estará em: electron-build/
```

---

## ⚠️ Checklist Antes de Lançar

- [ ] Versão atualizada no `package.json`
- [ ] Versão atualizada no `public/version.json`
- [ ] Changelog escrito no `public/version.json`
- [ ] `.exe` testado localmente
- [ ] Link do Google Drive configurado em `app/download.tsx`
- [ ] Push feito para o GitHub
- [ ] Vercel deploy completo









## ⚠️ ANDROID:

Se instalaste novas bibliotecas (npm install ...), mudaste o Ícone, o Nome da App ou mexeste no app.json.

- eas build -p android --profile preview 

Se mudaste apenas código **JavaScript/TypeScript** (lógica, cores, textos, componentes).


- eas update --branch preview --message "Pequenas correções e melhorias"