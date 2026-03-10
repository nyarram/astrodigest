import { db } from './client.js'

async function verify(): Promise<void> {
  const tables = [
    'users',
    'user_preferences',
    'raw_content',
    'prompt_versions',
    'processed_content',
    'digests',
  ] as const

  console.log('--- Row counts ---')
  for (const table of tables) {
    const result = await db
      .selectFrom(table)
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()
    console.log(`  ${table}: ${result.count}`)
  }

  console.log('\n--- Seeded prompt_versions ---')
  const prompts = await db
    .selectFrom('prompt_versions')
    .select(['name', 'version', 'model', 'active'])
    .orderBy('name')
    .execute()

  for (const p of prompts) {
    console.log(`  ${p.name} v${p.version} — model: ${p.model}, active: ${p.active}`)
  }

  await db.destroy()
  console.log('\nDatabase verified successfully.')
}

verify().catch((err: unknown) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
