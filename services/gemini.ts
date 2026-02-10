
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";

// Initialize Gemini Client
// Increased timeout to 10 minutes (600000ms) to allow for 9MB file uploads on slower connections
const ai = new GoogleGenAI({ 
    apiKey: process.env.API_KEY
});

// Dynamic Model Selection
let textModel = 'gemini-3-flash-preview'; // Default
try {
    const savedTier = localStorage.getItem('hedra_model_tier');
    if (savedTier === 'pro') {
        textModel = 'gemini-3-pro-preview';
    }
} catch (e) {
    console.warn("Failed to load model preference", e);
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'; 
// Video Model Removed
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TRANSCRIPTION_MODEL = 'gemini-2.0-flash';
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

// --- API Usage Tracking ---
const USAGE_KEY = 'hedra_api_usage_v1';

export interface UsageStats {
    transcriptions: number;
    summaries: number;
    chats: number;
    quizzes: number;
    flashcards: number;
    images: number;
    tts: number;
}

const defaultStats: UsageStats = {
    transcriptions: 0,
    summaries: 0,
    chats: 0,
    quizzes: 0,
    flashcards: 0,
    images: 0,
    tts: 0
};

// Custom Error Classes for Better Handling
export class FileTooLargeError extends Error {
    constructor(message: string = "الملف كبير جداً (أكثر من 9 ميجابايت).") {
        super(message);
        this.name = "FileTooLargeError";
    }
}

export class UnsupportedFormatError extends Error {
    constructor(message: string = "تنسيق الملف غير مدعوم أو الملف تالف.") {
        super(message);
        this.name = "UnsupportedFormatError";
    }
}

export class NetworkTimeoutError extends Error {
    constructor(message: string = "انتهت مهلة الاتصال بالخادم. الشبكة ضعيفة أو الملف كبير جداً.") {
        super(message);
        this.name = "NetworkTimeoutError";
    }
}

export class QuotaExceededError extends Error {
    constructor(message: string = "تجاوزت الحد المسموح به للاستخدام (Quota Limit). يرجى الانتظار دقيقة والمحاولة لاحقاً.") {
        super(message);
        this.name = "QuotaExceededError";
    }
}

const getStats = (): UsageStats => {
    try {
        const data = localStorage.getItem(USAGE_KEY);
        return data ? { ...defaultStats, ...JSON.parse(data) } : defaultStats;
    } catch {
        return defaultStats;
    }
};

const incrementUsage = (key: keyof UsageStats) => {
    const stats = getStats();
    stats[key]++;
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
};

const cleanJson = (text: string): string => {
    let clean = text.trim();
    if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    return clean;
};

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        let msg = "";
        if (err instanceof Error) msg = err.message.toLowerCase();
        else if (typeof err === 'object') msg = JSON.stringify(err).toLowerCase();
        else msg = String(err).toLowerCase();
        
        // 413 or Payload Too Large -> Do not retry
        if (msg.includes("413") || msg.includes("payload too large")) {
             throw new FileTooLargeError("حجم الملف يتجاوز الحد المسموح به للخادم.");
        }
        // 400 or Invalid Argument -> Do not retry
        if (msg.includes("400") || msg.includes("invalid argument")) {
            throw new UnsupportedFormatError("تنسيق الملف غير صالح أو تالف.");
        }

        // 429 or Quota Exceeded -> Specific handling
        if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
            if (retries > 0) {
                 console.warn(`Quota limit hit, retrying in ${delay}ms...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return retry(fn, retries - 1, delay * 2); 
            } else {
                 throw new QuotaExceededError("لقد استهلكت رصيدك المجاني من Google Gemini API مؤقتاً. يرجى الانتظار دقيقة قبل المحاولة.");
            }
        }

        // Retry on network/server errors (500, 503, xhr error, fetch failed, timeout, error code 6)
        if (retries > 0 && (
            msg.includes("500") || 
            msg.includes("503") || 
            msg.includes("xhr error") || 
            msg.includes("fetch failed") || 
            msg.includes("timeout") || 
            msg.includes("networkerror") ||
            msg.includes("error code: 6") || // Gemini specific XHR error code 6 (Network/Timeout)
            msg.includes("rpc failed")
        )) {
            console.warn(`Retrying operation... Attempts left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retry(fn, retries - 1, delay * 2);
        }
        throw err;
    }
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[];
  reaction?: 'like' | 'dislike' | null;
  timestamp?: Date;
}

export interface QuizQuestion {
  type: 'mcq' | 'tf' | 'essay';
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswerText?: string;
  explanation: string;
  unitTitle?: string;
  section?: string;
}

export interface Flashcard {
  term: string;
  definition: string;
}

const CHAT_SYSTEM_INSTRUCTION = `You are an academic assistant for Syrian Virtual University students.

You are ONLY allowed to use the content from the uploaded file.

STRICT RULES:

- Do not use any external knowledge.
- Do not guess.
- Do not complete missing information.
- If the answer is not in the file, say:
  "المعلومة غير موجودة في الملف المرفوع."

TASK:

Create a quiz based ONLY on the uploaded content.

Requirements:
- 10 to 20 questions.
- Mix of multiple choice and true/false.
- Each question must have its answer.
- Each question must reference the related paragraph.

Language: Arabic.
Tone: Clear and simple.`;

const SUPPORT_SYSTEM_INSTRUCTION = `أنت "هيدرا - الدعم الذكي". مهمتك مساعدة الطالب تقنياً وأكاديمياً بناءً على ملفاته المرفوعة وسجل استخدامه للتطبيق.`;

// Updated Strict Quiz Instruction
const QUIZ_SYSTEM_INSTRUCTION = `You are an academic exam generation system operating in STRICT MODE.

SOURCE RULES:
- Use ONLY the content of the uploaded file.
- Do NOT use external knowledge.
- Do NOT infer, assume, or complete missing information.
- Do NOT generate general questions.
- If information is not explicitly present in the file, do not generate questions about it.

UNIT DETECTION:
- Analyze the uploaded file carefully.
- Detect the number of distinct study units (lectures / chapters).
- A unit is defined ONLY if clearly separated by titles, headings, or structured sections.
- Do NOT invent units.
- Do NOT merge units.
- Do NOT assume units based on length.

QUESTION COUNT LOGIC (MANDATORY):
- Each detected unit generates EXACTLY 16 questions.
- Total questions = Number of units × 16.
- Maximum total questions allowed = 100.
- If the calculated total exceeds 100, generate ONLY 100 questions.
- When capped at 100, questions must be distributed sequentially across units without repetition.

QUESTION DISTRIBUTION PER UNIT (MANDATORY):
For EACH unit:
- 12 Multiple Choice questions.
- 2 True / False questions.
- 2 Essay questions.

QUALITY RULES:
- All questions must be directly derived from the unit content.
- No repetition across units.
- No filler questions.
- No invented examples.
- Essay questions must be fully answerable from the text.

OUTPUT STRUCTURE:
For EACH unit, output separately:

Unit Title:
- Section A: 12 Multiple Choice questions
- Section B: 2 True / False questions
- Section C: 2 Essay questions

LANGUAGE:
- Arabic.
- Clear academic tone.
- Suitable for Syrian Virtual University students.

FAILURE CONDITION:
- If the number of units cannot be clearly determined from the file, output ONLY:
  "لا يمكن تحديد عدد الوحدات بدقة من الملف المرفوع."
- Stop immediately and do not generate questions.`;

// Updated Strict Transcription Instruction (AUDIO ONLY)
const TRANSCRIPTION_SYSTEM_INSTRUCTION = `You are a speech-to-text assistant.

Convert the uploaded audio file to accurate Arabic text.

Rules:
- Preserve academic terms.
- Correct obvious transcription mistakes.
- Do not paraphrase.

Then use the transcript as the only source.`;

// NEW: Document Analysis Instruction (PDF/DOC/IMAGE)
const DOCUMENT_SYSTEM_INSTRUCTION = `You are an academic document processing assistant.
Your task is to extract the full text content from the uploaded document (PDF/Image) accurately.

Rules:
- Preserve the original structure (headings, paragraphs) as much as possible.
- Maintain all academic terms and definitions.
- Do not summarize; provide the full content.
- If the document contains images with text, extract that text.
- Output the result in Markdown format.
- Language: Arabic (or language of the document).`;

// Detailed Summary Instruction
const DETAILED_SUMMARY_INSTRUCTION = `You are a summarization assistant.
“The detailed summary length adjusts dynamically based on the file’s size and academic structure.”

Only use the uploaded file content.

Rules:
- No external information.
- No explanations outside the text.
- No personal opinions.

Task:
Create a structured academic summary.

Language: Arabic.`;

// Brief Summary Instruction (Strict Mode)
const BRIEF_SUMMARY_INSTRUCTION = `You are a summarization assistant.
“The length of the brief summary also adapts automatically to the size and academic structure of the uploaded file.”

Only use the uploaded file content.

Rules:
- No external information.
- No explanations outside the text.
- No personal opinions.

Task:
Create a brief structured academic summary.

Language: Arabic.`;

const STUDY_GUIDE_SYSTEM_INSTRUCTION = `أنت "هيدرا"، المشرف الأكاديمي الخبير بأساليب امتحانات الجامعة الافتراضية السورية (SVU).
مهمتك: تحويل النص المقدم إلى خطة دراسية استراتيجية وتفصيلية جداً.`;

export class LiveClient {
    private sessionPromise: Promise<any> | null = null;
    private ai: GoogleGenAI;

    constructor() {
        this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }

    connect(callbacks: {
        onOpen?: () => void,
        onMessage?: (data: string) => void,
        onClose?: () => void,
        onError?: (err: any) => void,
        onInterrupted?: () => void
    }) {
        this.sessionPromise = this.ai.live.connect({
            model: LIVE_MODEL,
            callbacks: {
                onopen: callbacks.onOpen,
                onmessage: (msg: LiveServerMessage) => {
                    const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audio && callbacks.onMessage) callbacks.onMessage(audio);
                    if (msg.serverContent?.interrupted && callbacks.onInterrupted) callbacks.onInterrupted();
                },
                onclose: callbacks.onClose,
                onerror: callbacks.onError
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                systemInstruction: CHAT_SYSTEM_INSTRUCTION
            }
        });
    }

    send(base64Pcm: string, sampleRate: number = 16000) {
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: { mimeType: `audio/pcm;rate=${sampleRate}`, data: base64Pcm }
                });
            });
        }
    }

    async disconnect() {
        if (this.sessionPromise) {
            const session = await this.sessionPromise;
            try { session.close(); } catch(e) {}
            this.sessionPromise = null;
        }
    }

    static floatTo16BitPCM(input: Float32Array): ArrayBuffer {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output.buffer;
    }

    static arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    
    static base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const GeminiService = {
  getUsage: (): UsageStats => getStats(),

  resetUsage: () => localStorage.setItem(USAGE_KEY, JSON.stringify(defaultStats)),

  setModelTier: (tier: 'flash' | 'pro') => {
    textModel = tier === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    localStorage.setItem('hedra_model_tier', tier);
  },

  getModelTier: (): 'flash' | 'pro' => {
    return textModel.includes('pro') ? 'pro' : 'flash';
  },

  async generateSpeech(text: string): Promise<string> {
    try {
        return await retry(async () => {
            if (!text || !text.trim()) return "";
            const cleanText = text.replace(/[*#_`\-]/g, ' ').substring(0, 400);
            if (!cleanText.trim()) return "";

            const response = await ai.models.generateContent({
                model: TTS_MODEL,
                contents: [{ parts: [{ text: cleanText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                },
            });
            incrementUsage('tts');
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!audioData) throw new Error("No audio data returned");
            return audioData;
        });
    } catch (error: any) { 
        if (error instanceof QuotaExceededError) throw error;
        console.error("TTS Error", error);
        throw new Error("عذراً، مشكلة في خدمة الصوت.");
    }
  },

  async transcribeAudio(base64Data: string, mimeType: string): Promise<string> {
    try {
        // Increase retries to 5 and delay to 4000ms for uploads to handle heavy load/network issues
        return await retry(async () => {
            let effectiveMimeType = mimeType;
            // Normalize audio types for stability
            if (mimeType === 'audio/lrec' || mimeType.includes('octet-stream')) {
                effectiveMimeType = 'audio/mpeg'; 
            }
            
            const isAudio = effectiveMimeType.startsWith('audio/') || effectiveMimeType.startsWith('video/');
            const instruction = isAudio ? TRANSCRIPTION_SYSTEM_INSTRUCTION : DOCUMENT_SYSTEM_INSTRUCTION;
            const prompt = isAudio ? "قم بتفريغ هذا الملف." : "قم باستخراج المحتوى النصي الكامل من هذا الملف.";

            const response = await ai.models.generateContent({
                model: TRANSCRIPTION_MODEL,
                contents: {
                    parts: [
                        { inlineData: { mimeType: effectiveMimeType, data: base64Data } },
                        { text: prompt }
                    ]
                },
                config: { 
                  systemInstruction: instruction,
                  temperature: 0.1
                }
            });
            incrementUsage('transcriptions');
            
            const result = response.text;
            if (!result || result.trim().length < 5) {
                throw new Error("Empty processing result");
            }
            return result;
        }, 5, 4000);
    } catch (error: any) { 
        if (error instanceof QuotaExceededError || error instanceof FileTooLargeError || error instanceof UnsupportedFormatError || error instanceof NetworkTimeoutError) {
            throw error;
        }

        let msg = "";
        if (error instanceof Error) {
            msg = error.message;
        } else if (typeof error === 'object') {
            msg = JSON.stringify(error);
        } else {
            msg = String(error);
        }
        const lowerMsg = msg.toLowerCase();
        
        // Log generic errors, but suppress the scary raw JSON RPC error if we identify it
        if (!lowerMsg.includes("error code: 6") && !lowerMsg.includes("rpc failed")) {
            console.error("Processing Error:", error);
        }
        
        if (lowerMsg.includes("xhr") || lowerMsg.includes("network") || lowerMsg.includes("error code: 6") || lowerMsg.includes("rpc failed")) {
            throw new NetworkTimeoutError("فشل الاتصال بالخادم. الشبكة ضعيفة أو الملف كبير جداً للمعالجة المباشرة.");
        }
        
        // Prevent raw JSON from being displayed to the user
        if (lowerMsg.includes(`"error":`) || lowerMsg.includes(`{"code"`)) {
             throw new Error("حدث خطأ تقني أثناء الاتصال بالخادم (API Error). يرجى المحاولة مرة أخرى.");
        }
        
        throw new Error(`فشل المعالجة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    }
  },

  async summarizeCourseContent(text: string, type: 'brief' | 'detailed' | 'key_terms'): Promise<string> {
    return retry(async () => {
        const safeText = text.substring(0, 100000); 
        let prompt = "";
        let instruction = BRIEF_SUMMARY_INSTRUCTION;

        if (type === 'detailed') {
            prompt = `المهمة: إعداد ملخص أكاديمي منظم وتفصيلي.\nالنص المرفق:\n${safeText}`;
            instruction = DETAILED_SUMMARY_INSTRUCTION;
        } else if (type === 'key_terms') {
            prompt = `المهمة: استخراج المصطلحات والمفاهيم العلمية الأساسية.\nالنص المرفق:\n${safeText}`;
            instruction = DETAILED_SUMMARY_INSTRUCTION; // Use detailed rules for precision
        } else {
            prompt = `المهمة: إعداد ملخص موجز وعالي المستوى.\nالنص المرفق:\n${safeText}`;
            instruction = BRIEF_SUMMARY_INSTRUCTION;
        }

        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{ text: prompt }] },
            config: { 
                systemInstruction: instruction,
                temperature: 0.2
            }
        });
        incrementUsage('summaries');
        return response.text || "فشل التلخيص.";
    });
  },

  async getRelatedResources(query: string): Promise<{ title: string; uri: string }[]> {
    return retry(async () => {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{ text: `ابحث عن مصادر تعليمية لـ: ${query.substring(0, 1000)}` }] },
            config: { tools: [{ googleSearch: {} }] }
        });
        let resources: { title: string; uri: string }[] = [];
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
            if (chunk.web?.uri) resources.push({ title: chunk.web.title || "مصدر", uri: chunk.web.uri });
        });
        return resources;
    });
  },

  async sendChatMessage(history: ChatMessage[], newMessage: string, transcript?: string | null, useSearch: boolean = false): Promise<{ text: string; sources?: { title: string; uri: string }[] }> {
    return retry(async () => {
        const tools = useSearch ? [{ googleSearch: {} }] : undefined;
        const contextInjection = transcript ? `\n\n[سياق المحاضرة الحالية]:\n${transcript.substring(0, 20000)}` : "";
        
        const chat = ai.chats.create({
            model: textModel,
            config: { systemInstruction: CHAT_SYSTEM_INSTRUCTION + contextInjection, tools: tools },
            history: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }))
        });
        const result = await chat.sendMessage({ message: newMessage });
        incrementUsage('chats');
        let sources: { title: string; uri: string }[] = [];
        result.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
            if (chunk.web?.uri) sources.push({ title: chunk.web.title || "مصدر", uri: chunk.web.uri });
        });
        return { text: result.text || "", sources };
    });
  },

  async sendSupportMessage(history: ChatMessage[], newMessage: string, transcript?: string | null): Promise<string> {
    return retry(async () => {
        const contextInjection = transcript ? `\n\n[سياق المحاضرة التي يدرسها الطالب الآن]:\n${transcript.substring(0, 10000)}` : "";
        const chat = ai.chats.create({
            model: textModel,
            config: { systemInstruction: SUPPORT_SYSTEM_INSTRUCTION + contextInjection },
            history: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }))
        });
        const result = await chat.sendMessage({ message: newMessage });
        incrementUsage('chats');
        return result.text || "";
    });
  },

  async evaluateEssayAnswer(question: string, expectedAnswer: string, studentAnswer: string): Promise<{ isCorrect: boolean, feedback: string }> {
    return retry(async () => {
        const prompt = `بصفتك مصححاً أكاديمياً، قارن إجابة الطالب بالنموذج المطلوب.\nالسؤال: ${question}\nالنموذج المطلوب: ${expectedAnswer}\nإجابة الطالب: ${studentAnswer}`;

        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isCorrect: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    },
                    required: ["isCorrect", "feedback"]
                }
            }
        });
        return JSON.parse(cleanJson(response.text || "{}"));
    });
  },

  async generateQuiz(text: string): Promise<QuizQuestion[]> {
    return retry(async () => {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { 
                parts: [{ 
                    text: `النص المرجعي:\n${text.substring(0, 100000)}\n\nGenerate the quiz following the STRICT unit distribution: 12 MCQ, 2 T/F, 2 Essay per unit.` 
                }] 
            },
            config: { 
                systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctAnswerIndex: { type: Type.INTEGER },
                            correctAnswerText: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            unitTitle: { type: Type.STRING },
                            section: { type: Type.STRING }
                        },
                        required: ["type", "question", "correctAnswerText", "explanation"]
                    }
                },
                temperature: 0.1
            }
        });
        incrementUsage('quizzes');
        return JSON.parse(cleanJson(response.text || "[]"));
    }, 1, 3000); 
  },

  async analyzeStudyFocus(text: string): Promise<string> {
    return retry(async () => {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{ text: `قم بإعداد خطة دراسية استراتيجية لهذا المحتوى:\n\n${text.substring(0, 100000)}` }] },
            config: { 
                systemInstruction: STUDY_GUIDE_SYSTEM_INSTRUCTION,
                temperature: 0.3
            }
        });
        return response.text || "";
    });
  },

  async generateFlashcards(text: string): Promise<Flashcard[]> {
    return retry(async () => {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: { parts: [{ text: `استخرج بطاقات ذاكرة من النص: ${text.substring(0, 25000)}` }] },
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } },
                        required: ["term", "definition"]
                    }
                }
            }
        });
        incrementUsage('flashcards');
        return JSON.parse(cleanJson(response.text || "[]"));
    });
  },

  async generateImages(prompt: string, aspectRatio: string, style: string, negativePrompt: string): Promise<string[]> {
      return retry(async () => {
          const response = await ai.models.generateContent({
              model: IMAGE_MODEL,
              contents: { parts: [{ text: `${prompt}. Style: ${style}. Negative: ${negativePrompt}` }] },
              config: { imageConfig: { aspectRatio: aspectRatio as any } }
          });
          incrementUsage('images');
          const images: string[] = [];
          response.candidates?.[0]?.content?.parts?.forEach(p => {
              if (p.inlineData) images.push(`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);
          });
          return images;
      });
  },

  async generateVideo(params: { prompt: string; image?: string; lastFrame?: string; aspectRatio?: '16:9' | '9:16' }): Promise<string> {
    return retry(async () => {
        // Veo requires the latest API key, so we instantiate a new client here as per guidelines
        const freshAi = new GoogleGenAI({ 
            apiKey: process.env.API_KEY
        });

        const getBase64 = (dataUrl: string) => dataUrl.split(',')[1];
        const getMimeType = (dataUrl: string) => dataUrl.split(';')[0].split(':')[1];

        const config: any = {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: params.aspectRatio || '16:9'
        };

        if (params.lastFrame) {
            config.lastFrame = {
                imageBytes: getBase64(params.lastFrame),
                mimeType: getMimeType(params.lastFrame)
            };
        }

        const request: any = {
            model: 'veo-3.1-fast-generate-preview',
            prompt: params.prompt,
            config: config
        };

        if (params.image) {
            request.image = {
                imageBytes: getBase64(params.image),
                mimeType: getMimeType(params.image)
            };
        }

        let operation = await freshAi.models.generateVideos(request);
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await freshAi.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("Video generation failed: No URI returned.");

        const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to download generated video.");
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    });
  }
};
