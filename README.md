[![Job Matcher Agent](https://github.com/ae7656cp/job-matcher-agent/actions/workflows/job-search.yml/badge.svg)](https://github.com/ae7656cp/job-matcher-agent/actions/workflows/job-search.yml)
# Job Matcher Agent 🤖

Автоматизированный агент для поиска и анализа вакансий на сайте Robota.ua для QA Engineer.

## Функционал
- **Авто-парсинг**: Ищет актуальные вакансии на robota.ua с помощью Playwright.
- **ИИ-анализ**: Использует LLM (через Groq API) для оценки соответствия вакансии вашему профилю.
- **Умная фильтрация**: Выводит процент соответствия для каждой вакансии.
- **Автоматизация**: Запускается по расписанию через GitHub Actions.

## Стек технологий
- TypeScript
- Playwright
- OpenAI / Groq API
