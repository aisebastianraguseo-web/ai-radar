import type { SourceType } from '@/types/database'

export interface SourceDefinition {
  id: string
  name: string
  type: SourceType
  url: string
  vendor: string | null
  fetchStrategy: 'rss' | 'hn_api' | 'arxiv_api' | 'github_api'
}

export const INGESTION_SOURCES: SourceDefinition[] = [
  {
    id: 'openai-blog',
    name: 'OpenAI Blog',
    type: 'blog_official',
    url: 'https://openai.com/blog/rss',
    vendor: 'openai',
    fetchStrategy: 'rss',
  },
  {
    id: 'anthropic-blog',
    name: 'Anthropic Blog',
    type: 'blog_official',
    url: 'https://www.anthropic.com/rss.xml',
    vendor: 'anthropic',
    fetchStrategy: 'rss',
  },
  {
    id: 'deepmind-blog',
    name: 'Google DeepMind Blog',
    type: 'blog_official',
    url: 'https://deepmind.google/blog/rss.xml',
    vendor: 'google_deepmind',
    fetchStrategy: 'rss',
  },
  {
    id: 'hacker-news',
    name: 'Hacker News Top 50',
    type: 'hacker_news',
    url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50',
    vendor: null,
    fetchStrategy: 'hn_api',
  },
  {
    id: 'arxiv-ai',
    name: 'ArXiv cs.AI + cs.CL',
    type: 'arxiv',
    url: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=50',
    vendor: null,
    fetchStrategy: 'arxiv_api',
  },
  {
    id: 'github-trending-ai',
    name: 'GitHub Trending AI',
    type: 'github_trending',
    url: 'https://api.github.com/search/repositories?q=topic:artificial-intelligence+pushed:>2024-01-01&sort=stars&order=desc&per_page=30',
    vendor: null,
    fetchStrategy: 'github_api',
  },
]
