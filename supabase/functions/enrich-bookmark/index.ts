const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { title, url, note } = await req.json() as {
    title: string
    url: string
    note: string
  }

  const model = Deno.env.get('OPENROUTER_MODEL') ?? 'nvidia/nemotron-3-super-120b-a12b:free'
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const prompt = `You are enriching a saved bookmark.

Title: ${title}
URL: ${url}
Reason user saved it: ${note}

Generate:
1. A short summary
2. 3 concise tags

Respond in JSON only, with keys "summary" (string) and "tags" (string[]).`

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return new Response(
      JSON.stringify({ error: text }),
      { status: upstream.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const completion = await upstream.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const raw = completion.choices[0]?.message?.content ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return new Response(
      JSON.stringify({}),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }

  return new Response(
    JSON.stringify({ summary: parsed.summary, tags: parsed.tags }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
