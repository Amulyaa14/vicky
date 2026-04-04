import { Hono } from 'hono';

type Bindings = {
    AI: any;
};

const aiRouter = new Hono<{ Bindings: Bindings }>();

// Core LLM generation handling
const generateAIResponse = async (ai: any, systemPrompt: string, userText: string): Promise<string> => {
    try {
        const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userText }
            ]
        });
        return response.response.trim();
    } catch (e: any) {
        console.error("AI Generation Error: ", e);
        throw new Error('AI Generation failed');
    }
};

aiRouter.post('/writing', async (c) => {
    try {
        const body = await c.req.json();
        const { action, text } = body;

        if (!text) {
            return c.json({ error: 'Text is required' }, 400);
        }

        let systemPrompt = "You are a helpful AI writing assistant.";

        switch (action) {
            case 'summarize':
                systemPrompt = "You are an expert editor. Summarize the following text concisely, extracting only the most critical bullet points or a short paragraph. Do not add conversational filler; just output the summary.";
                break;
            case 'grammar':
                systemPrompt = "You are a strict proofreader. Fix any spelling and grammar mistakes in the following text. Do not change the original meaning or tone. Only output the corrected text. Do not add any conversational filler or introductions. Do not say 'Here is the fixed text:'. Just return the raw fixed text.";
                break;
            case 'grammar-check':
                systemPrompt = "You are a strict proofreader. Analyze the following text and list out explicitly any spelling or grammatical errors found as bullet points. If there are no issues, output exactly 'No obvious grammar issues found. Text looks good!'. Keep your response extremely brief.";
                break;
            case 'improve':
                systemPrompt = "You are a professional copywriter. Improve the flow, vocabulary, and readability of the following text to make it sound highly professional and engaging. Keep the core meaning intact. Only output the improved text. Do not add conversational filler.";
                break;
            case 'expand':
                systemPrompt = "You are an articulate writer. Expand upon the following text, adding relevant elaboration, details, and logical continuations to make it richer and longer. Maintain the original tone. Only output the expanded text without conversational filler.";
                break;
            case 'formal':
                systemPrompt = "Convert the following text into highly formal, professional, corporate English. Only output the rewritten text without conversational filler.";
                break;
            case 'casual':
                systemPrompt = "Convert the following text into friendly, approachable, and casual English. Only output the rewritten text without conversational filler.";
                break;
            default:
                return c.json({ error: 'Invalid action' }, 400);
        }

        const result = await generateAIResponse(c.env.AI, systemPrompt, text);
        return c.json({ result });
    } catch (e: any) {
        return c.json({ error: e.message || 'Internal Server Error' }, 500);
    }
});

aiRouter.post('/plagiarism', async (c) => {
    try {
        const body = await c.req.json();
        const { text } = body;

        if (!text) {
            return c.json({ error: 'Text is required' }, 400);
        }

        const systemPrompt = "You are a plagiarism detection tool. Analyze the following block of text. Determine if it closely resembles famous quotes, widely known literature, or very generic copy-pasted phrases. If it is highly generic or known, point it out. Otherwise, creatively confirm that it appears '✅ No plagiarism detected. Content appears original.' Provide a very brief 1-2 sentence evaluation.";

        const result = await generateAIResponse(c.env.AI, systemPrompt, text);
        return c.json({ result });
    } catch (e: any) {
        return c.json({ error: e.message || 'Internal Server Error' }, 500);
    }
});

export default aiRouter;
