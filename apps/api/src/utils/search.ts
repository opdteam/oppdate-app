export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

export async function tavilySearch(query: string, maxResults = 4): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: TavilyResult[] }
    const results = (data.results ?? []).slice(0, maxResults)
    console.log('tavily search: ' + query + ' -> ' + results.length + ' results')
    return results
  } catch (err) {
    console.log('tavily search failed: ' + (err instanceof Error ? err.message : String(err)))
    return []
  }
}
