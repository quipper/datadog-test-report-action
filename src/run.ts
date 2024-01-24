import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as glob from '@actions/glob'
import { createMetricsClient } from './client'
import { parseJunitXml } from './junitxml'
import { getJunitXmlMetrics, unixTime } from './metrics'

type Inputs = {
  junitXmlPath: string
  metricNamePrefix: string
  datadogApiKey: string
  datadogSite: string
  datadogTags: string[]
}

export const run = async (inputs: Inputs): Promise<void> => {
  const metricsContext = {
    prefix: inputs.metricNamePrefix,
    tags: [...inputs.datadogTags],
    timestamp: unixTime(new Date()),
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
