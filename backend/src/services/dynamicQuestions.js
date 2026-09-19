import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateDynamicQuestions({ problemText, languageCode, apiKey }) {
  let geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 10) {
    geminiKey = apiKey.trim();
  }

  if (!geminiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a helpful clinical AI assistant. The patient has reported the following problem/symptom: "${problemText}".
Generate exactly 4 relevant, dynamic follow-up questions to understand their condition better. Do not ask a question if they have already provided the answer in their symptom report.

IMPORTANT LANGUAGE INSTRUCTION:
You MUST generate ALL QUESTIONS AND OPTIONS STRICTLY in the language corresponding to this ISO language code: "${languageCode}".
DO NOT use the language of the problem text if it differs from the requested language code. 
For example, if the language code is "te-IN" (Telugu), you MUST output the JSON with all text in Telugu, even if the problem text is in English.

IMPORTANT CONTEXT INSTRUCTION:
The patient's problem already provides context. DO NOT ask questions where the answer is already obvious from the symptom report. For example, if they say "I have stomach pain", DO NOT ask "Where is the pain located?". Focus on new, clarifying follow-ups (e.g. severity, duration, associated symptoms).

Return STRICTLY a JSON object with this exact schema:
{
  "id": "dynamic_assessment",
  "keywords": [],
  "title": "Dynamic Clinical Assessment",
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "select", 
      "options": ["Option 1", "Option 2", "Option 3"]
    },
    {
      "id": "q2",
      "text": "Another question here",
      "type": "text",
      "placeholder": "Type your answer here"
    }
  ]
}
Mix "select" type and "text" type questions. For "select", provide 3-4 likely options.
Return ONLY valid JSON. Do not include extra conversational text or markdown code blocks like \`\`\`json.`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Extract JSON using regex just in case there is text before/after
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    } else {
      text = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    }
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error('Error generating dynamic questions:', error);
    return null;
  }
}
