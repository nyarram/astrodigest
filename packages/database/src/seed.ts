import { db } from './client.js'

const PROMPT_VERSIONS = [
  {
    name: 'quick_hit',
    version: 1,
    model: 'llama-3.3-70b-versatile',
    active: true,
    prompt_template: `You are an astronomy communicator writing for curious non-specialist adults who love space but don't have PhDs.

Summarize this in exactly 3 sentences:
1. What was discovered or observed
2. Why it matters or what's surprising
3. What it means for our understanding going forward

Never use jargon without immediately explaining it.
Always cite the institution or telescope involved.
Do not editorialize or overstate significance.

Source: {{source}}
Title: {{title}}
Abstract: {{abstract}}`,
  },
  {
    name: 'big_story',
    version: 1,
    model: 'llama-3.3-70b-versatile',
    active: true,
    prompt_template: `You are an astronomy communicator writing the lead story for a weekly digest read by informed enthusiasts.

Write a 4-paragraph explanation:
1. The discovery in plain terms (what happened, where, with what instrument)
2. The science behind why this is hard to detect or study
3. What specifically is new vs prior knowledge
4. Broader implications — what questions does this open up

Tone: Carl Sagan meets journalism. Awe without hype.
Length: 250-350 words.
If the source names a specific researcher or institution, mention them. If no researcher is named in the source material, do NOT invent one — instead attribute the finding to the institution or telescope used (e.g. 'ESO researchers', 'the ALMA team', 'NASA scientists').
Always note whether this is peer-reviewed or a preprint.

Source: {{source}}
Title: {{title}}
Abstract: {{abstract}}
URL: {{url}}`,
  },
] as const

async function seed(): Promise<void> {
  for (const prompt of PROMPT_VERSIONS) {
    const existing = await db
      .selectFrom('prompt_versions')
      .select('id')
      .where('name', '=', prompt.name)
      .where('version', '=', prompt.version)
      .executeTakeFirst()

    if (existing) {
      console.log(`Skipping prompt_versions(${prompt.name}, v${prompt.version}) — already exists`)
      continue
    }

    await db.insertInto('prompt_versions').values(prompt).execute()
    console.log(`Inserted prompt_versions(${prompt.name}, v${prompt.version})`)
  }

  await db.destroy()
  console.log('Seed complete.')
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
