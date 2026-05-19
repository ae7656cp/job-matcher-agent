import OpenAI from 'openai';
import { chromium } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

interface Vacancy {
    id: string;
    title: string;
    description: string;
    company: string;
    link: string;
}

// ... (инициализация клиента OpenAI остается прежней)

async function fetchVacancies(keyword: string): Promise<Vacancy[]> {
    console.log(`📡 Поиск вакансий по запросу: "${keyword}"...`);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    const uniqueVacancies = new Map<string, Vacancy>();

    try {
        const searchUrl = `https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(8000);

        const cards = await page.$$('alliance-vacancy-card-desktop, cv-vacancy-card, [data-sidebar-id], a[href*="/vacancy/"]');
        
        for (const card of cards) {
            // 1. Получаем ТОЛЬКО заголовок из h2, принудительно беря только первую строку
            const rawTitle = await card.$eval('h2', el => (el as HTMLElement).innerText.split('\n')[0].trim()).catch(() => 'Без названия');
            
            // 2. Получаем полный текст отдельно для ИИ
            const fullDescription = await card.innerText().catch(() => '');
            
            const linkRaw = await card.$eval('a', el => el.getAttribute('href') || '').catch(() => '');
            const fullLink = linkRaw.startsWith('http') ? linkRaw : `https://robota.ua${linkRaw}`;
            const company = await card.$eval('a[href*="/company/"], .company', el => el.textContent || 'Компания скрыта').catch(() => 'Компания скрыта');

            const normalizedTitle = rawTitle.toLowerCase().trim();

            if (rawTitle !== 'Без названия' && !uniqueVacancies.has(normalizedTitle)) {
                uniqueVacancies.set(normalizedTitle, { 
                    id: Math.random().toString(), 
                    title: rawTitle,
                    description: fullDescription.replace(/\n/g, ' ').trim(), // Текст для ИИ очищен от переносов
                    company: company.trim(), 
                    link: fullLink 
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
    const vacancies = await fetchVacancies ("QA Engineer");
    
    if (vacancies.length === 0) {
        console.log("⚠️ Вакансии не найдены.");
        return;
    }

    console.log(`✅ Найдено: ${vacancies.length}.\n`);

    for (const v of vacancies) {
        console.log(`=========================================`);
        console.log(`💼 ВАКАНСИЯ: ${v.title}`);
        console.log(`🏢 КОМПАНИЯ: ${v.company}`);
        
        // Добавляем КРАТКОЕ описание (обрезаем до 200 символов, чтобы не было "каши")
        const shortDesc = v.description.length > 200 
            ? v.description.substring(0, 200) + "..." 
            : v.description;
        console.log(`📝 ОПИСАНИЕ: ${shortDesc.replace(/\n/g, ' ')}`); 
        
        console.log(`🔗 ССЫЛКА: ${v.link}`);
    }
}

startAgent();