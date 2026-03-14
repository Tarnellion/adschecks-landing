import { stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const siteUrl = 'https://adschecks.com'
const rootDir = resolve(new URL('..', import.meta.url).pathname)
const sitemapPath = resolve(rootDir, 'sitemap.xml')

const routes = [
    { path: '/', source: 'index.html', priority: '1.0' },
    { path: '/pricing/', source: 'pricing/index.html', priority: '0.8' },
    { path: '/what-we-verify/', source: 'what-we-verify/index.html', priority: '0.7' },
    { path: '/status-model/', source: 'status-model/index.html', priority: '0.6' },
    { path: '/about/', source: 'about/index.html', priority: '0.6' },
    { path: '/faq/', source: 'faq/index.html', priority: '0.6' }
]

const formatDate = date => date.toISOString().slice(0, 10)

const buildEntry = async ({ path, source, priority }) => {
    const sourcePath = resolve(rootDir, source)
    const { mtime } = await stat(sourcePath)

    return `    <url>
        <loc>${siteUrl}${path}</loc>
        <lastmod>${formatDate(mtime)}</lastmod>
        <priority>${priority}</priority>
    </url>`
}

const entries = await Promise.all(routes.map(buildEntry))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`

await writeFile(sitemapPath, xml, 'utf8')

console.log(`Updated sitemap: ${sitemapPath}`)
