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

> Это единственное изменение в CF. Всё остальное (домен, переменные окружения, _redirects) остаётся как было.

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

---

## Если деплой упал — как смотреть логи

1. **Pages → adschecks → Deployments**
2. Кликни на упавший деплой
3. Открой вкладку **Build log**
4. Ищи строку с ошибкой (обычно `error` или `failed`)

Самые частые причины:
- Node version — убедись что в `.node-version` стоит `18`
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
│   │   └── BaseLayout.astro    # шапка, навигация, футер
│   └── pages/
│       ├── index.astro         # главная
│       ├── pricing/index.astro
│       ├── faq/index.astro
│       ├── about/index.astro
│       ├── what-we-verify/index.astro
│       ├── status-model/index.astro
│       ├── privacy-policy/index.astro
│       ├── terms-and-conditions/index.astro
│       ├── refund-policy/index.astro
│       ├── legal-notice/index.astro
│       └── 404.astro
├── public/                     # статика (styles, assets, og.png, _redirects)
├── dist/                       # генерируется при билде, НЕ коммитить
├── astro.config.mjs
├── package.json
└── .node-version               # 18
```

> Старые HTML-файлы (`index.html`, `pricing/index.html` и т.д.) остаются в репо — они не мешают Astro, просто не используются при сборке.

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
