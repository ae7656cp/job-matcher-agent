import OpenAI from 'openai';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import path from 'path';

// Принудительно загружаем .env из папки проекта
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MY_PROFILE = {
    role: "Junior Manual QA Engineer / Junior QA Automation",
    experience: "Без коммерческого опыта (Разработка учебных проектов и систем автоматизации)",
    skills: ["Playwright", "JavaScript", "TypeScript", "Postman", "SQL", "Jira", "GitHub", "Telegram Bot"]
};

// Проверяем наличие ключа перед созданием клиента
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ ОШИБКА: Ключ API не найден в переменных окружения!");
    process.exit(1);
}

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
});

interface Vacancy {
    id: string;
    title: string;
    company: string;
    link: string;
    description: string;
}

async function getAIAnalysis(description: string): Promise<string> {
    try {
        // Мы обновляем промпт, чтобы потребовать процент соответствия
        const prompt = `
        Ты HR-ассистент. Проанализируй вакансию на основе профиля кандидата.
        Мой профиль: ${JSON.stringify(MY_PROFILE)}
        Вакансия: ${description}
        
        ОТВЕТЬ СТРОГО В ТАКОМ ФОРМАТЕ:
        1. Соответствие: [X]%
        2. Анализ: [Кратко 2 предложения: сильные стороны и чего не хватает]
        `;

        const completion = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
        });
        
        return completion.choices[0].message.content || "Нет ответа";
    } catch (error: any) {
        return "Ошибка ИИ: " + (error.message || "произошла ошибка");
    }
}

async function fetchVacancies(keyword: string): Promise<Vacancy[]> {
    console.log(`📡 Поиск по запросу: "${keyword}"...`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const uniqueVacancies = new Map<string, Vacancy>();

    try {
        await page.goto(`https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(10000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(5000);
        const cards = await page.$$('alliance-vacancy-card-desktop, cv-vacancy-card, a[href*="/vacancy/"]');
        
        for (const card of cards) {
            const rawTitle = await card.$eval('h2', el => el.textContent || '').catch(() => 'Без названия');
            const description = await card.innerText().catch(() => '');
            const linkRaw = await card.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
            const company = await card.$eval('a[href*="/company/"], .company', el => el.textContent || 'Компания скрыта').catch(() => 'Компания скрыта');

            const fullLink = linkRaw.startsWith('http') ? linkRaw : `https://robota.ua${linkRaw}`;
            const normalizedTitle = rawTitle.toLowerCase().trim();

            if (rawTitle.trim() !== 'Без названия' && !uniqueVacancies.has(normalizedTitle)) {
                uniqueVacancies.set(normalizedTitle, { 
                    id: Math.random().toString(), title: rawTitle.trim(), company: company.trim(), link: fullLink, description 
                });
            }
        }
    } catch (error) {
        console.error("❌ Ошибка парсинга:", error);
    } finally {
        await browser.close();
    }
    return Array.from(uniqueVacancies.values());
}

async function startAgent(): Promise<void> {
    const vacancies = await fetchVacancies("QA Engineer");
    console.log(`✅ Найдено: ${vacancies.length}. Начинаю анализ...`);
    
    for (const v of vacancies) {
        console.log(`\n💼 ${v.title} | ${v.company}`);
        const analysis = await getAIAnalysis(v.description);
        console.log(`🧠 АНАЛИЗ: ${analysis}`);
        console.log(`🔗 ${v.link}`);
    }
}

startAgent();
