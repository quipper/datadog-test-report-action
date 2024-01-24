import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as glob from '@actions/glob'
import { createMetricsClient } from './client'
import { parseJunitXml } from './junitxml'
import { getJunitXmlMetrics } from './metrics'

type Inputs = {
  junitXmlPath: string
  datadogApiKey?: string
  datadogSite?: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const metricsClient = createMetricsClient(inputs)

  const junitXmlGlob = await glob.create(inputs.junitXmlPath)
  for await (const junitXmlPath of junitXmlGlob.globGenerator()) {
    core.info(`Processing ${junitXmlPath}`)
    const f = await fs.readFile(junitXmlPath)
    const junitXml = parseJunitXml(f)
    const metrics = getJunitXmlMetrics(junitXml)

    await metricsClient.submitMetrics(metrics.series, junitXmlPath)
    await metricsClient.submitDistributionPoints(metrics.distributionPointsSeries, junitXmlPath)
  }
}
