/**
 * useAI Hook
 * Manages AI chat state and API calls
 */

import { supabase } from '@/lib/supabase';
import { useCallback, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    imageUrl?: string;
    timestamp: Date;
    isLoading?: boolean;
}

interface SendOptions {
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
}

// ============================================
// HELPER - Generate unique ID
// ============================================

const generateId = () => Math.random().toString(36).substring(2, 15);

// ============================================
// POLLINATIONS IMAGE URL
// ============================================

const generatePollinationsUrl = (prompt: string): string => {
    const cleanPrompt = prompt.replace(/^\/image\s*/i, '').trim();
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&nologo=true`;
};

// ============================================
// CHECK IF IMAGE REQUEST
// ============================================

const isImageRequest = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (
        lowerText.startsWith('/image') ||
        lowerText.includes('gera uma imagem') ||
        lowerText.includes('cria uma imagem') ||
        lowerText.includes('desenha') ||
        lowerText.includes('generate an image') ||
        lowerText.includes('create an image') ||
        lowerText.includes('draw')
    );
};

// ============================================
// HOOK
// ============================================

export function useAI() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Olá! Sou o teu AI Study Assistant.\n\nPosso ajudar-te a:\n• 📚 Explicar conceitos\n• 🧮 Resolver exercícios\n• 📝 Fazer resumos\n• 🖼️ Gerar imagens (escreve "/image" + descrição)\n\nEnvia uma foto ou escreve a tua dúvida!',
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    // ============================================
    // SEND MESSAGE
    // ============================================

    const sendMessage = useCallback(async (options: SendOptions) => {
        const { prompt, imageBase64, mimeType } = options;

        if (!prompt.trim() && !imageBase64) return;

        // Add user message
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: prompt,
            imageUrl: imageBase64 ? `data:${mimeType};base64,${imageBase64}` : undefined,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        // Check if it's an image generation request
        if (isImageRequest(prompt) && !imageBase64) {
            const imageUrl = generatePollinationsUrl(prompt);
            
            const aiMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: '🎨 Aqui está a tua imagem:',
                imageUrl,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
            return;
        }

        // Add loading message
        const loadingMessage: Message = {
            id: 'loading',
            role: 'assistant',
            content: 'A pensar...',
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages(prev => [...prev, loadingMessage]);

        try {
            // Call Edge Function
            const { data, error } = await supabase.functions.invoke('ai-tutor', {
                body: {
                    prompt,
                    imageBase64,
                    mimeType,
                },
            });

            // Remove loading message
            setMessages(prev => prev.filter(m => m.id !== 'loading'));

            if (error) {
                console.error('AI Function Error:', error);
                // Try to extract error details
                const errorDetails = error.context?.body || error.message;
                throw new Error(typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails));
            }

            // Add AI response
            const aiMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: data?.response || 'Desculpa, não consegui processar a tua pergunta.',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (err: any) {
            console.error('AI Error:', err);

            // Remove loading message
            setMessages(prev => prev.filter(m => m.id !== 'loading'));

            // Try to get more error info
            let errorMsg = 'Não foi possível contactar a AI';
            if (err.message) {
                errorMsg = err.message;
            }
            if (err.context?.body) {
                try {
                    const body = typeof err.context.body === 'string' 
                        ? JSON.parse(err.context.body) 
                        : err.context.body;
                    if (body.response) errorMsg = body.response;
                    if (body.error) errorMsg = body.error;
                } catch (e) {
                    // Ignore parse errors
                }
            }

            // Add error message
            const errorMessage: Message = {
                id: generateId(),
                role: 'system',
                content: `❌ Erro: ${errorMsg}`,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ============================================
    // CLEAR CHAT
    // ============================================

    const clearChat = useCallback(() => {
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: '👋 Chat limpo! Como posso ajudar-te?',
                timestamp: new Date(),
            },
        ]);
    }, []);

    return {
        messages,
        isLoading,
        sendMessage,
        clearChat,
    };
}
