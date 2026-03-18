import Parser from 'rss-parser'
import type { SourceDefinition } from './sources'

export interface FetchedItem {
  source_url: string
  title: string
  content: string | null
  publish_date: string | null
  vendor: string | null
}

const rssParser = new Parser({ timeout: 10000 })

async function fetchRss(source: SourceDefinition): Promise<FetchedItem[]> {
  const feed = await rssParser.parseURL(source.url)
  return (feed.items ?? []).map((item) => ({
    source_url: item.link ?? item.guid ?? '',
    title: item.title ?? '(no title)',
    content: item.contentSnippet ?? item.content ?? item.summary ?? null,
    publish_date: item.pubDate ?? item.isoDate ?? null,
    vendor: source.vendor,
  }))
}

interface HnHit {
  url?: string
  story_url?: string
  title?: string
  story_title?: string
  created_at?: string
}

async function fetchHackerNews(_source: SourceDefinition): Promise<FetchedItem[]> {
  const resp = await fetch(
    'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50',
    { signal: AbortSignal.timeout(10000) }
  )
  if (!resp.ok) throw new Error(`HN API error: ${resp.status}`)
  const data = (await resp.json()) as { hits?: HnHit[] }
  return (data.hits ?? [])
    .filter((h) => h.url ?? h.story_url)
    .map((h) => ({
      source_url: h.url ?? h.story_url ?? '',
      title: h.title ?? h.story_title ?? '(no title)',
      content: null,
      publish_date: h.created_at ?? null,
      vendor: null,
    }))
}

async function fetchArxiv(_source: SourceDefinition): Promise<FetchedItem[]> {
  const resp = await fetch(
    'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=50',
    { signal: AbortSignal.timeout(15000) }
  )
  if (!resp.ok) throw new Error(`ArXiv API error: ${resp.status}`)
  const xml = await resp.text()

  // Simple regex-based Atom entry extraction (avoids heavy XML parser dep)
  const entries: FetchedItem[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1] ?? ''
    const idMatch = /<id>(.*?)<\/id>/.exec(entry)
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(entry)
    const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(entry)
    const publishedMatch = /<published>(.*?)<\/published>/.exec(entry)

    if (idMatch?.[1]) {
      entries.push({
        source_url: idMatch[1].trim(),
        title: titleMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? '(no title)',
        content: summaryMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? null,
        publish_date: publishedMatch?.[1]?.trim() ?? null,
        vendor: null,
      })
    }
  }
  return entries
}

interface GithubRepo {
  html_url?: string
  full_name?: string
  description?: string
  pushed_at?: string
}

async function fetchGithub(_source: SourceDefinition): Promise<FetchedItem[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const resp = await fetch(
    'https://api.github.com/search/repositories?q=topic:artificial-intelligence+pushed:>2024-01-01&sort=stars&order=desc&per_page=30',
    { headers, signal: AbortSignal.timeout(10000) }
  )
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`)
  const data = (await resp.json()) as { items?: GithubRepo[] }
  return (data.items ?? []).map((repo) => ({
    source_url: repo.html_url ?? '',
    title: repo.full_name ?? '(no name)',
    content: repo.description ?? null,
    publish_date: repo.pushed_at ?? null,
    vendor: null,
  }))
}

export async function fetchSource(source: SourceDefinition): Promise<FetchedItem[]> {
  switch (source.fetchStrategy) {
    case 'rss':
      return fetchRss(source)
    case 'hn_api':
      return fetchHackerNews(source)
    case 'arxiv_api':
      return fetchArxiv(source)
    case 'github_api':
      return fetchGithub(source)
  }
}
