import * as core from '@actions/core'
import { client, v1 } from '@datadog/datadog-api-client'

type Inputs = {
  enableMetrics: boolean
  datadogApiKey?: string
  datadogSite?: string
}

export type MetricsClient = {
  submitMetrics: (series: v1.Series[], description: string) => Promise<void>
  submitDistributionPoints(series: v1.DistributionPointsSeries[], description: string): Promise<void>
}

class DryRunMetricsClient implements MetricsClient {
  // eslint-disable-next-line @typescript-eslint/require-await
  async submitMetrics(series: v1.Series[], description: string): Promise<void> {
    core.startGroup(`Metrics payload (dry-run) (${description})`)
    core.info(JSON.stringify(series, undefined, 2))
    core.endGroup()
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async submitDistributionPoints(series: v1.DistributionPointsSeries[], description: string): Promise<void> {
    core.startGroup(`Distribution points payload (dry-run) (${description})`)
    core.info(JSON.stringify(series, undefined, 2))
    core.endGroup()
  }
}

class RealMetricsClient implements MetricsClient {
  constructor(private readonly metricsApi: v1.MetricsApi) {}

  async submitMetrics(series: v1.Series[], description: string): Promise<void> {
    core.startGroup(`Metrics payload (${description})`)
    core.info(JSON.stringify(series, undefined, 2))
    core.endGroup()

    core.info(`Sending ${series.length} metrics to Datadog`)
    const accepted = await this.metricsApi.submitMetrics({ body: { series } })
    core.info(`Sent ${JSON.stringify(accepted)}`)
  }

  async submitDistributionPoints(series: v1.DistributionPointsSeries[], description: string): Promise<void> {
    core.startGroup(`Distribution points payload (${description})`)
    core.info(JSON.stringify(series, undefined, 2))
    core.endGroup()

    core.info(`Sending ${series.length} distribution points to Datadog`)
    const accepted = await this.metricsApi.submitDistributionPoints({ body: { series } })
    core.info(`Sent ${JSON.stringify(accepted)}`)
  }
}

export const createMetricsClient = (inputs: Inputs): MetricsClient => {
  if (!inputs.enableMetrics) {
    return new DryRunMetricsClient()
  }
  if (!inputs.datadogApiKey) {
    core.warning('Datadog API key is not set. No metrics will be sent actually.')
    return new DryRunMetricsClient()
  }

  const configuration = client.createConfiguration({
    authMethods: {
      apiKeyAuth: inputs.datadogApiKey,
    },
  })
  if (inputs.datadogSite) {
    client.setServerVariables(configuration, {
      site: inputs.datadogSite,
    })
  }
  return new RealMetricsClient(new v1.MetricsApi(configuration))
}
