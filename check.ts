import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

// Клиент автоматически найдет переменную OPENAI_API_KEY
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1',
});

async function main() {
  try {
    console.log("🚀 Запрос к Groq...");
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: 'Привет! Если ты это читаешь, значит всё заработало!' }],
      model: 'llama-3.3-70b-versatile',
    });

    console.log("✅ Успех:", completion.choices[0].message.content);
  } catch (err: any) {
    console.error("❌ Ошибка:", err.message);
  }
}
main();