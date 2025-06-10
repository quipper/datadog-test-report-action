import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as glob from '@actions/glob'
import * as path from 'path'
import { createMatcher } from './codeowners.js'
import { createMetricsClient } from './datadog.js'
import { writeSummary } from './summary.js'
import { getTestReportMetrics } from './metrics.js'
import { Context } from './github.js'
import { FindOwners, parseTestReportFiles } from './junitxml.js'

type Inputs = {
  junitXmlPath: string
  metricNamePrefix: string
  filterTestFileSlowerThan: number
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
    filterTestFileSlowerThan: inputs.filterTestFileSlowerThan,
    filterTestCaseSlowerThan: inputs.filterTestCaseSlowerThan,
    sendTestCaseSuccess: inputs.sendTestCaseSuccess,
    sendTestCaseFailure: inputs.sendTestCaseFailure,
  }
  core.startGroup('Metrics context')
  core.info(JSON.stringify(metricsContext, undefined, 2))
  core.endGroup()

  const metricsClient = createMetricsClient(inputs)
  const junitXmlGlob = await glob.create(inputs.junitXmlPath)
  const junitXmlFiles = await junitXmlGlob.glob()
  const testReport = await parseTestReportFiles(junitXmlFiles, await createFindOwners(inputs))

  const metrics = getTestReportMetrics(testReport, metricsContext)
  await metricsClient.submitMetrics(metrics.series, `${junitXmlFiles.length} files`)
  await metricsClient.submitDistributionPoints(metrics.distributionPointsSeries, `${junitXmlFiles.length} files`)

  writeSummary(testReport, inputs.testCaseBaseDirectory, context)
  await core.summary.write()
}

const createFindOwners = async (inputs: Inputs): Promise<FindOwners> => {
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
    return () => []
  }
  core.info(`Parsing ${codeowners}`)
  const matcher = createMatcher(await fs.readFile(codeowners, 'utf8'))
  return (filename: string) => {
    const canonicalPath = path.join(inputs.testCaseBaseDirectory, filename)
    return matcher.findOwners(canonicalPath).map((owner) => owner.replace(/^@.+?\/|^@/, '')) // Remove leading @organization/
  }
}

const unixTime = (date: Date): number => Math.floor(date.getTime() / 1000)
