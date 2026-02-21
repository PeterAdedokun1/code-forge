/**
 * MIMI Conversation Memory — localStorage-based context system
 * 
 * Core Context Storage Mechanism
 * 
 * Stores conversation history and symptom data in localStorage so
 * that on the next page load, MIMI can greet the user with context
 * like "Last time, you told me your head was hurting. How is it today?"
 */

export interface MemoryEntry {
    id: string;
    timestamp: string;
    userMessage: string;
    mimiResponse: string;
    detectedSymptoms: string[];
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
}

export interface UserMemory {
    userName: string;
    lastVisit: string;
    conversationCount: number;
    entries: MemoryEntry[];
    lastSymptoms: string[];
    lastRiskLevel: 'low' | 'medium' | 'high';
    lastRiskScore: number;
    cumulativeSymptoms: string[];
}

const MEMORY_KEY = 'mimi_conversation_memory';
const MAX_ENTRIES = 50;

/**
 * Get the full user memory from localStorage
 */
export function getMemory(): UserMemory | null {
    try {
        const raw = localStorage.getItem(MEMORY_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as UserMemory;
    } catch {
        return null;
    }
}

/**
 * Initialize or update the user's memory
 */
export function initializeMemory(userName?: string): UserMemory {
    const existing = getMemory();
    if (existing) {
        existing.lastVisit = new Date().toISOString();
        saveMemory(existing);
        return existing;
    }

    const fresh: UserMemory = {
        userName: userName || 'Mama',
        lastVisit: new Date().toISOString(),
        conversationCount: 0,
        entries: [],
        lastSymptoms: [],
        lastRiskLevel: 'low',
        lastRiskScore: 0,
        cumulativeSymptoms: []
    };

    saveMemory(fresh);
    return fresh;
}

/**
 * Save memory to localStorage
 */
function saveMemory(memory: UserMemory): void {
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (e) {
        console.error('Failed to save memory:', e);
    }
}

/**
 * Add a conversation entry to memory
 */
export function addMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): void {
    const memory = getMemory() || initializeMemory();

    const newEntry: MemoryEntry = {
        ...entry,
        id: `entry_${Date.now()}`,
        timestamp: new Date().toISOString()
    };

    memory.entries.push(newEntry);

    // Keep only last N entries
    if (memory.entries.length > MAX_ENTRIES) {
        memory.entries = memory.entries.slice(-MAX_ENTRIES);
    }

    // Update tracking fields
    memory.conversationCount++;
    memory.lastVisit = new Date().toISOString();
    memory.lastSymptoms = entry.detectedSymptoms;
    memory.lastRiskLevel = entry.riskLevel;
    memory.lastRiskScore = entry.riskScore;

    // Build cumulative symptoms list (unique)
    const allSymptoms = new Set(memory.cumulativeSymptoms);
    entry.detectedSymptoms.forEach(s => allSymptoms.add(s));
    memory.cumulativeSymptoms = Array.from(allSymptoms);

    saveMemory(memory);
}

/**
 * Generate a context-aware greeting based on previous conversations
 */
export function getContextGreeting(): string {
    const memory = getMemory();

    if (!memory || memory.entries.length === 0) {
        return "Hello Mama! I'm MIMI, your maternal health companion. How are you and your baby feeling today? You fit tell me anything — I dey here for you.";
    }

    const lastVisitDate = new Date(memory.lastVisit);
    const now = new Date();
    const hoursSinceLastVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60));

    let greeting = '';

    // Time-based greeting
    if (hoursSinceLastVisit < 1) {
        greeting = `Welcome back, ${memory.userName}! `;
    } else if (hoursSinceLastVisit < 24) {
        greeting = `Good to see you again today, ${memory.userName}! `;
    } else if (hoursSinceLastVisit < 72) {
        greeting = `${memory.userName}, good to hear from you again! `;
    } else {
        greeting = `${memory.userName}! I don miss you o. Welcome back! `;
    }

    // Symptom follow-up
    if (memory.lastSymptoms.length > 0) {
        const symptomNames = memory.lastSymptoms.slice(0, 2).join(' and ');
        greeting += `Last time, you told me about ${symptomNames.toLowerCase()}. How e dey now? E don better? `;
    }

    // Risk-based follow-up
    if (memory.lastRiskLevel === 'high') {
        greeting += 'I was worried about you o. Did you go see doctor? ';
    } else if (memory.lastRiskLevel === 'medium') {
        greeting += 'Make sure you dey take care of yourself. ';
    }

    greeting += 'How you and baby dey today?';

    return greeting;
}

/**
 * Get the full conversation text for risk assessment
 * (combines all messages from this session and recent history)
 */
export function getConversationContext(): string {
    const memory = getMemory();
    if (!memory) return '';

    // Get last 5 entries for context
    const recentEntries = memory.entries.slice(-5);
    return recentEntries
        .map(e => `User: ${e.userMessage}\nMIMI: ${e.mimiResponse}`)
        .join('\n\n');
}

/**
 * Clear all memory (for demo reset)
 */
export function clearMemory(): void {
    localStorage.removeItem(MEMORY_KEY);
}

/**
 * Get a summary of historical symptoms for the CHEW dashboard
 */
export function getSymptomHistory(): Array<{ symptom: string; date: string; count: number }> {
    const memory = getMemory();
    if (!memory) return [];

    const symptomMap = new Map<string, { date: string; count: number }>();

    for (const entry of memory.entries) {
        for (const symptom of entry.detectedSymptoms) {
            const existing = symptomMap.get(symptom);
            if (existing) {
                existing.count++;
                existing.date = entry.timestamp; // most recent
            } else {
                symptomMap.set(symptom, { date: entry.timestamp, count: 1 });
            }
        }
    }

    return Array.from(symptomMap.entries()).map(([symptom, data]) => ({
        symptom,
        date: new Date(data.date).toLocaleDateString(),
        count: data.count
    }));
}
