import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run'

const main = async (): Promise<void> => {
  await run({
    junitXmlPath: core.getInput('junit-xml-path', { required: true }),
    metricNamePrefix: core.getInput('metric-name-prefix', { required: true }),
    filterTestCaseSlowerThan: parseFloat(core.getInput('filter-test-case-slower-than', { required: true })),
    sendTestCaseSuccess: core.getBooleanInput('send-test-case-success', { required: true }),
    sendTestCaseFailure: core.getBooleanInput('send-test-case-failure', { required: true }),
    datadogApiKey: core.getInput('datadog-api-key'),
    datadogSite: core.getInput('datadog-site'),
    datadogTags: core.getMultilineInput('datadog-tags'),
    repositoryOwner: github.context.repo.owner,
    repositoryName: github.context.repo.repo,
    workflowName: github.context.workflow,
  })
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
