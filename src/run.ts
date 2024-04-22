import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as glob from '@actions/glob'
import { createMetricsClient } from './client.js'
import { parseJunitXml } from './junitxml.js'
import { getJunitXmlMetrics, unixTime } from './metrics.js'

type Inputs = {
  junitXmlPath: string
  metricNamePrefix: string
  filterTestCaseSlowerThan: number
  sendTestCaseSuccess: boolean
  sendTestCaseFailure: boolean
  datadogApiKey: string
  datadogSite: string
  datadogTags: string[]
  repositoryOwner: string
  repositoryName: string
  workflowName: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const workflowTags = [
    // Keep less cardinality for cost perspective.
    `repository_owner:${inputs.repositoryOwner}`,
    `repository_name:${inputs.repositoryName}`,
    `workflow_name:${inputs.workflowName}`,
  ]

  const metricsContext = {
    prefix: inputs.metricNamePrefix,
    tags: [...workflowTags, ...inputs.datadogTags],
    timestamp: unixTime(new Date()),
    filterTestCaseSlowerThan: inputs.filterTestCaseSlowerThan,
    sendTestCaseSuccess: inputs.sendTestCaseSuccess,
    sendTestCaseFailure: inputs.sendTestCaseFailure,
  }
  core.info(`Metrics context: ${JSON.stringify(metricsContext, undefined, 2)}`)

  const metricsClient = createMetricsClient(inputs)
  const junitXmlGlob = await glob.create(inputs.junitXmlPath)
  for await (const junitXmlPath of junitXmlGlob.globGenerator()) {
    core.info(`Processing ${junitXmlPath}`)
    const f = await fs.readFile(junitXmlPath)
    const junitXml = parseJunitXml(f)
    const metrics = getJunitXmlMetrics(junitXml, metricsContext)

    await metricsClient.submitMetrics(metrics.series, junitXmlPath)
    await metricsClient.submitDistributionPoints(metrics.distributionPointsSeries, junitXmlPath)
  }
}
