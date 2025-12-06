const { GoogleGenerativeAI } = require('@google/generative-ai');

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelId });
};

/**
 * Run a Gemini prompt and return the text output.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
const runGeminiPrompt = async (prompt) => {
  const model = getModel();
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });
  return result.response.text();
};

module.exports = { runGeminiPrompt };
