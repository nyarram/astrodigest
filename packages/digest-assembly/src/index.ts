import { logger } from './logger.js'
import { DigestAssembler } from './assembler.js'

async function run(): Promise<void> {
  logger.info('digest assembly started')

  const assembler = new DigestAssembler()

  const weekOf = getMondayOfCurrentWeek()
  logger.info({ weekOf }, 'assembling digest for week')

  const sections = await assembler.assemble()
  const digestId = await assembler.persist(weekOf, sections)

  logger.info({ digestId }, 'digest assembly complete')
}

function getMondayOfCurrentWeek(): Date {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

run().catch((err: unknown) => {
  logger.error({ err }, 'digest assembly failed')
  process.exit(1)
})
