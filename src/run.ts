import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as glob from '@actions/glob'
import { createMatcher } from './codeowners.js'
import { createMetricsClient } from './datadog.js'
import { parseJunitXml } from './junitxml.js'
import { getJunitXmlMetrics } from './metrics.js'
import { Context } from './github.js'

type Inputs = {
  junitXmlPath: string
  metricNamePrefix: string
  filterTestCaseSlowerThan: number
  sendTestCaseSuccess: boolean
  sendTestCaseFailure: boolean
  testCaseBaseDirectory: string
  enableMetrics: boolean
  datadogApiKey: string
  datadogSite: string
  datadogTags: string[]
}

export const run = async (inputs: Inputs, context: Context): Promise<void> => {
  const workflowTags = [
    // Keep less cardinality for cost perspective.
    `repository_owner:${context.repo.owner}`,
    `repository_name:${context.repo.repo}`,
    `workflow_name:${context.workflow}`,
    `event_name:${context.eventName}`,
    `ref_name:${context.refName}`,
  ]

  const metricsContext = {
    prefix: inputs.metricNamePrefix,
    tags: [...workflowTags, ...inputs.datadogTags],
    timestamp: unixTime(new Date()),
    filterTestCaseSlowerThan: inputs.filterTestCaseSlowerThan,
    sendTestCaseSuccess: inputs.sendTestCaseSuccess,
    sendTestCaseFailure: inputs.sendTestCaseFailure,
    codeownersMatcher: await createCodeownersMatcher(),
    testCaseBaseDirectory: inputs.testCaseBaseDirectory,
  }
  core.startGroup('Metrics context')
  core.info(JSON.stringify(metricsContext, undefined, 2))
  core.endGroup()

  const metricsClient = createMetricsClient(inputs)
  const junitXmlGlob = await glob.create(inputs.junitXmlPath)
  for await (const junitXmlPath of junitXmlGlob.globGenerator()) {
    core.info(`Processing ${junitXmlPath}`)
    const f = await fs.readFile(junitXmlPath)
    const junitXml = parseJunitXml(f)
    core.startGroup(`Parsed ${junitXmlPath}`)
    core.info(JSON.stringify(junitXml, undefined, 2))
    core.endGroup()

    const metrics = getJunitXmlMetrics(junitXml, metricsContext)

    await metricsClient.submitMetrics(metrics.series, junitXmlPath)
    await metricsClient.submitDistributionPoints(metrics.distributionPointsSeries, junitXmlPath)
  }
}

const createCodeownersMatcher = async () => {
  const tryAccess = async (path: string): Promise<string | null> => {
    try {
      await fs.access(path)
      return path
    } catch {
      return null
    }
  }
  // https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-file-location
  const codeowners =
    (await tryAccess('.github/CODEOWNERS')) ?? (await tryAccess('CODEOWNERS')) ?? (await tryAccess('docs/CODEOWNERS'))
  if (!codeowners) {
    return createMatcher('')
  }
  core.info(`Parsing ${codeowners}`)
  return createMatcher(await fs.readFile(codeowners, 'utf8'))
}

const unixTime = (date: Date): number => Math.floor(date.getTime() / 1000)
