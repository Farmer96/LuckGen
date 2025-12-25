import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateEventDetails = async (topic: string): Promise<{ title: string; description: string }> => {
    try {
        const ai = getClient();
        const prompt = `
        根据这个主题："${topic}"，为一个抽奖/赠品活动创建一个吸引人的标题和简短、令人兴奋的描述（最多2句话）。
        请使用中文回复。
        Return the result in strictly valid JSON format like: {"title": "...", "description": "..."}
        Do not add Markdown code blocks.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Error:", error);
        return {
            title: `${topic} 幸运大抽奖`,
            description: "快来参加我们的精彩活动，有机会赢取丰厚大奖！"
        };
    }
};