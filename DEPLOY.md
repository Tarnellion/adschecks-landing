# Deploy Guide — AdsChecks Landing

Инструкция для деплоя Astro-версии сайта на Cloudflare Pages.

---

## Шаг 1 — Один раз: обновить настройки Cloudflare Pages

Это нужно сделать **один раз** перед первым пушем Astro-версии.

1. Открой [dash.cloudflare.com](https://dash.cloudflare.com)
2. Перейди: **Pages → adschecks → Settings → Builds & deployments**
3. Нажми **Edit configuration** и измени:

   | Поле | Старое значение | Новое значение |
   |---|---|---|
   | Build command | *(пусто)* | `npm run build` |
   | Build output directory | `/` или `.` | `dist/client` |

4. Нажми **Save**

---

## Шаг 1b — Один раз: переменные окружения

**Pages → adschecks → Settings → Environment variables**

| Переменная | Значение | Окружения |
|---|---|---|
| `PUBLIC_GA_ID` | `G-XXXXXXXXXX` (ID своего GA4-потока) | Production **и** Preview |

Это обязательный шаг, если нужна аналитика. Переменная читается на этапе сборки
(`import.meta.env.PUBLIC_GA_ID` в `src/layouts/BaseLayout.astro`), поэтому после её
добавления или изменения нужен **новый деплой** — на уже собранный сайт она не подействует.

Поведение без переменной осознанное, а не баг: если `PUBLIC_GA_ID` не задан, в HTML
не попадает ни баннер согласия, ни код gtag — вообще ничего. Так превью- и локальные
сборки гарантированно не шлют данные в аналитику.

Когда переменная задана, действует второй уровень гейтинга — уже в браузере: скрипт
Google подгружается только после нажатия **Accept** в баннере. Выбор запоминается в
`localStorage` под ключом `consent-analytics` (`granted` / `denied`). Если посетитель
нажал Decline или просто проигнорировал баннер, запроса к `googletagmanager.com` не будет.

Префикс `PUBLIC_` обязателен — без него Astro не отдаст значение в клиентский код.

---

## Шаг 2 — Пушить код

```bash
cd /Users/t.govorukha/AdsChecks

git add .
git status          # убедись что берёшь нужные файлы
git commit -m "feat: migrate landing to Astro SSG"
git push origin main
```

После пуша Cloudflare Pages автоматически:
1. Запустит `npm install`
2. Запустит `npm run build`
3. Задеплоит содержимое `dist/client/` на CDN

---

## Шаг 3 — Проверить деплой

1. Открой [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages → adschecks**
2. Дождись статуса **Success** (обычно 1–2 минуты)
3. Открой сайт и проверь:
   - Главная страница открывается
   - Навигация работает (About, Pricing, FAQ и т.д.)
   - Мобильное меню работает
   - Нет 404 на внутренних страницах
   - В DevTools → Network стили приходят одним файлом из `/_astro/` (а не семью запросами)
   - `https://adschecks.com/sitemap-index.xml` отдаёт 200, `/sitemap.xml` — 301 на него
   - Если задан `PUBLIC_GA_ID` — внизу виден баннер согласия, и запрос к
     `googletagmanager.com` появляется только после нажатия **Accept**

---

## Если деплой упал — как смотреть логи

1. **Pages → adschecks → Deployments**
2. Кликни на упавший деплой
3. Открой вкладку **Build log**
4. Ищи строку с ошибкой (обычно `error` или `failed`)

Самые частые причины:
- Node version — убедись что в `.node-version` стоит `22` (Astro 6 требует Node 22)
- Зависимости — запусти `npm install` локально и проверь нет ли ошибок
- Путь output — должен быть `dist/client`, не `dist`

---

## Откат (если что-то пошло не так)

В Cloudflare Pages можно мгновенно откатиться на предыдущий деплой:

1. **Pages → adschecks → Deployments**
2. Найди последний рабочий деплой
3. Нажми **...** → **Rollback to this deployment**

Это не трогает код в GitHub — просто переключает production на старую сборку.

---

## Структура после Astro-миграции

```
AdsChecks/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro    # шапка, навигация, футер, баннер согласия, импорт CSS
│   ├── components/             # PricingCards.astro, PricingCustomRow.astro
│   ├── data/
│   │   └── plans.ts            # цены тарифов + offers для JSON-LD
│   ├── styles/                 # единственный источник CSS, бандлится Astro
│   │   ├── index.css           # точка входа: порядок @layer + импорты
│   │   ├── foundation.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── hero.css
│   │   ├── pages.css
│   │   └── utilities.css
│   ├── content/blog/           # markdown-статьи блога
│   ├── content.config.ts       # схема коллекции blog
│   └── pages/
│       ├── index.astro         # главная
│       ├── pricing/index.astro
│       ├── faq/index.astro
│       ├── about/index.astro
│       ├── what-we-verify/index.astro
│       ├── ad-slot-verification/index.astro
│       ├── status-model/index.astro
│       ├── blog/               # index.astro + [slug].astro
│       ├── privacy-policy/index.astro
│       ├── terms-and-conditions/index.astro
│       ├── refund-policy/index.astro
│       ├── legal-notice/index.astro
│       └── 404.astro
├── public/                     # копируется как есть: script.js, assets/, og.png,
│                               # robots.txt, _redirects, _headers
├── dist/                       # генерируется при билде, НЕ коммитить
│   └── client/                 # ← это и есть output directory для CF Pages
├── astro.config.mjs
├── playwright.config.js
├── package.json
└── .node-version               # 22
```

> CSS не лежит в `public/`. Он живёт только в `src/styles/` и подключается импортом
> `import '../styles/index.css'` в `BaseLayout.astro` — Astro бандлит и минифицирует его
> в один файл с хешем в имени внутри `/_astro/`. Файл в `public/` попал бы в сборку
> нетронутым и в обход бандлера, поэтому директории `public/styles/` быть не должно.

### Что раздаёт Cloudflare из `public/`

- `_redirects` — старые адреса (`/pricing-usage`, `/refunds-disputes`),
  редирект `/sitemap.xml` → `/sitemap-index.xml`, канонизация `.html` → директория.
- `_headers` — security-заголовки (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy`, HSTS) и годовой immutable-кэш для `/_astro/*` и `/assets/*`.
  Кэш на `/_astro/*` безопасен именно потому, что Astro пишет хеш в имя файла.
- `robots.txt` — ссылается на `https://adschecks.com/sitemap-index.xml`
  (интеграция sitemap отдаёт индекс, а не плоский `sitemap.xml`).

---

## Обычный рабочий цикл после миграции

```bash
# Локальная разработка
npm run dev        # dev-сервер на localhost:4321

# Перед пушем — проверить сборку
npm run build      # должно быть "Complete!" без ошибок

# Деплой
git add .
git commit -m "описание изменений"
git push origin main
```
