/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ========================================
        // TEMA CLARO - Inspirado no Design Moderno
        // ========================================

        // Backgrounds
        background: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceAlt: '#F5F5F5',

        // Texto
        text: {
          primary: '#1A1A1A',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          inverse: '#FFFFFF',
        },

        // Primário (CTAs, elementos principais)
        primary: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          DEFAULT: '#1A1A1A',
        },

        // Acento (XP, Gamificação, Sucesso)
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: '#10B981',
        },

        // Secundário (Links, Squads)
        secondary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          DEFAULT: '#6366F1',
        },

        // Status - Quests por tipo
        quest: {
          study: '#3B82F6',      // Azul - Estudo
          assignment: '#F59E0B', // Laranja - Trabalhos
          exam: '#EF4444',       // Vermelho - Exames
        },

        // UI Elements
        border: '#E5E7EB',
        divider: '#F3F4F6',
        overlay: 'rgba(0,0,0,0.5)',

        // Tier Colors (Gamificação)
        tier: {
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#FFD700',
          platinum: '#E5E4E2',
          diamond: '#B9F2FF',
        },
      },

      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        'card': '20px',
        'pill': '9999px',
        'button': '14px',
      },

      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'cardHover': '0 4px 20px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 8px rgba(0, 0, 0, 0.1)',
      },

      spacing: {
        'safe': '16px',
        'card': '20px',
      },
    },
  },
  plugins: [],
};