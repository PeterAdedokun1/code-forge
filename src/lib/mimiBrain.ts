/**
 * MIMI AI Brain — Gemini API Integration
 * 
 * Pillar 1: The Voice-First Conversation
 * 
 * Connects to Google Gemini API with a carefully engineered prompt
 * that makes the AI act like MIMI — warm, caring, speaking Pidgin,
 * asking about symptoms. Also includes text-to-speech output.
 * 
 * Falls back to a smart local response engine if API is unavailable.
 */

import { buildSystemPrompt } from './languageStore';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// System prompt is now built dynamically from the language store
// (see src/lib/languageStore.ts)

/**
 * Local fallback response engine — smart keyword-based responses
 * Used when Gemini API is unavailable or for instant responses
 */
function getLocalResponse(userMessage: string, _conversationHistory: string[]): string {
    const lower = userMessage.toLowerCase();

    // Pre-eclampsia compound symptoms
    const hasHeadache = /head|headache|migraine/.test(lower);
    const hasSwelling = /swell|swollen|big|puffy|edema/.test(lower);
    const hasVision = /blur|vision|eye|see double|spots/.test(lower);
    const hasBP = /blood pressure|bp|hypertension/.test(lower);

    if ((hasHeadache && hasSwelling) || (hasHeadache && hasVision) || (hasSwelling && hasVision) || (hasBP && (hasHeadache || hasSwelling))) {
        return "Ah Mama, this one I dey hear concern me small o. Head pain with swelling or eye problem fit be sign of high blood pressure. Abeg I beg you, check your BP today today. If e dey high, go clinic sharp sharp. You and baby must stay safe!";
    }

    // Bleeding — urgent
    if (/bleed|blood|spot/.test(lower)) {
        return "Mama, any bleeding for pregnancy we must take am serious o. How much blood you see? Abeg go hospital now now or call your health worker. No wait at all. I dey here with you, but doctor need check you.";
    }

    // Headache alone
    if (hasHeadache) {
        return "Sorry to hear that, Mama. This headache, how many days e don stay? You fit check your blood pressure? And make sure you dey drink plenty water. If e no stop, we go need to see your doctor.";
    }

    // Swelling alone
    if (hasSwelling) {
        return "Eyah, swelling fit happen for pregnancy, but we need watch am. Your hands or face dey swell too? When last you check your blood pressure? Put your feet up and rest small, Mama.";
    }

    // Baby not moving
    if (/baby.*not.*mov|baby.*no.*mov|no.*kick|less.*movement|reduced.*movement/.test(lower)) {
        return "Mama, this one dey important o! When last you feel baby move? Try lie down for left side, drink cold water, and wait. If baby no move within 2 hours, abeg go hospital immediately. Baby movement na important sign.";
    }

    // Fever
    if (/fever|hot|temperature|chill|shiver/.test(lower)) {
        return "Body dey hot? Fever for pregnancy we need take am serious. How high the temperature? Drink plenty water and rest. If e no come down or you feel worse, see doctor today. No take paracetamol without asking doctor first.";
    }

    // Pain
    if (/pain|hurt|ache|cramp|belle/.test(lower)) {
        return "Sorry Mama! Where exactly the pain dey? How e feel — sharp or dull? When e start? Pain for pregnancy we must monitor am careful. If e dey severe or come with blood, go hospital immediately.";
    }

    // Feeling good / well
    if (/good|fine|well|great|okay|better|thank/.test(lower)) {
        return "Wonderful, Mama! Na good news be that! Keep doing wetin you dey do — take your folic acid, drink water, and rest well. You and baby dey great! I dey here anytime you need me. 💕";
    }

    // Tiredness
    if (/tired|fatigue|weak|exhausted|no energy/.test(lower)) {
        return "Small tiredness na normal for pregnancy, Mama, but make sure you dey rest well o. You dey eat well? Iron and vitamins dey help. If the tiredness too much or you dey feel dizzy, tell your health worker.";
    }

    // Nausea / vomiting
    if (/nausea|vomit|throwing up|sick|morning sickness/.test(lower)) {
        return "Eyah, sorry Mama. Morning sickness fit dey annoying but e dey common. Try eat small small food, ginger tea fit help too. If you no fit keep food down at all, see doctor because you need stay hydrated.";
    }

    // Breathing difficulty
    if (/breath|breathless|chest tight|can't breathe/.test(lower)) {
        return "Mama, difficulty breathing na something we must take serious o! If you dey struggle to breathe, please go hospital now. If na small breathlessness when you walk, that fit be pregnancy normal, but still tell your doctor.";
    }

    // General greeting
    if (/hello|hi|hey|good morning|good afternoon|good evening/.test(lower)) {
        return "Hello Mama! How you and baby dey today? I dey here to hear about how you dey feel. Anything wey dey bother you, you fit tell me. How body?";
    }

    // Follow up / duration question - conversational context
    if (/day|week|hour|start|began|since/.test(lower)) {
        return "Thank you for telling me, Mama. That information go help me understand better. Any other thing you notice? Like dizziness, swelling, or any change for how you dey feel?";
    }

    // Default — open-ended
    return "I hear you, Mama. Thank you for sharing with me. How you dey feel now now? Any other symptoms wey dey bother you? Remember, no question too small — I dey here for you and baby. 💕";
}

/**
 * Send a message to Gemini API and get MIMI's response
 */
export async function getMimiResponse(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
    // If no API key, use local fallback
    if (!GEMINI_API_KEY) {
        console.log('No Gemini API key found, using local response engine');
        return getLocalResponse(userMessage, conversationHistory.map(m => m.content));
    }

    try {
        // Build conversation context for Gemini
        const contents = [
            {
                role: 'user',
                parts: [{ text: buildSystemPrompt() + '\n\nPlease respond as MIMI from now on.' }]
            },
            {
                role: 'model',
                parts: [{ text: "Okay! I am MIMI, your caring maternal health companion. How body, Mama? How you and baby dey today? I dey here for you! 💕" }]
            }
        ];

        // Add conversation history
        for (const msg of conversationHistory.slice(-6)) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 200,
                        topP: 0.9,
                        topK: 40
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            }
        );

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return getLocalResponse(userMessage, conversationHistory.map(m => m.content));
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            return text.trim();
        }

        return getLocalResponse(userMessage, conversationHistory.map(m => m.content));
    } catch (error) {
        console.error('Error calling Gemini:', error);
        return getLocalResponse(userMessage, conversationHistory.map(m => m.content));
    }
}

/**
 * Text-to-Speech — Make MIMI speak her responses aloud
 */
export function speakResponse(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech not supported');
        if (onEnd) onEnd();
        return;
    }

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a warm female voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(v =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('saman') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('hazel') ||
            v.name.toLowerCase().includes('fiona') ||
            v.name.toLowerCase().includes('karen') ||
            v.name.toLowerCase().includes('moira') ||
            v.name.toLowerCase().includes('tessa') ||
            v.name.toLowerCase().includes('google'))
    );

    if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    utterance.onerror = () => {
        if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Pre-load voices (needed on some browsers)
 */
export function preloadVoices(): void {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
}
