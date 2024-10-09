import * as core from '@actions/core'
import { v1 } from '@datadog/datadog-api-client'
import { JunitXml, TestCase, TestSuite } from './junitxml.js'

export type Metrics = {
  series: v1.Series[]
  distributionPointsSeries: v1.DistributionPointsSeries[]
}

export type Context = {
  prefix: string
  tags: string[]
  timestamp: number
  filterTestCaseSlowerThan: number
  sendTestCaseSuccess: boolean
  sendTestCaseFailure: boolean
}

export const getJunitXmlMetrics = (junitXml: JunitXml, context: Context): Metrics => {
  const testSuites = junitXml.testsuites?.testsuite ?? junitXml.testsuite ?? []
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  for (const testSuite of testSuites) {
    const tsm = getTestSuiteMetrics(testSuite, context)
    metrics.series.push(...tsm.series)
    metrics.distributionPointsSeries.push(...tsm.distributionPointsSeries)
  }
  return metrics
}

const getTestSuiteMetrics = (testSuite: TestSuite, context: Context): Metrics => {
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  const tags = [...context.tags, `testsuite_name:${testSuite['@_name']}`]

  metrics.series.push({
    metric: `${context.prefix}.testsuite.count`,
    points: [[context.timestamp, 1]],
    type: 'count',
    tags,
  })
  const duration = testSuite['@_time']
  if (duration > 0) {
    metrics.distributionPointsSeries.push({
      metric: `${context.prefix}.testsuite.duration`,
      points: [[context.timestamp, [duration]]],
      tags,
    })
  }
  for (const testCase of testSuite.testcase ?? []) {
    const tcm = getTestCaseMetrics(testCase, context)
    metrics.series.push(...tcm.series)
    metrics.distributionPointsSeries.push(...tcm.distributionPointsSeries)
  }

  for (const childTestSuite of testSuite.testsuite ?? []) {
    const tsm = getTestSuiteMetrics(childTestSuite, context)
    metrics.series.push(...tsm.series)
    metrics.distributionPointsSeries.push(...tsm.distributionPointsSeries)
  }
  return metrics
}

const getTestCaseMetrics = (testCase: TestCase, context: Context): Metrics => {
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  const tags = [...context.tags, `testcase_name:${testCase['@_name']}`]
  if (testCase['@_classname']) {
    tags.push(`testcase_classname:${testCase['@_classname']}`)
  }
  if (testCase['@_file']) {
    tags.push(`testcase_file:${testCase['@_file']}`)
  }

  if (!testCase.failure && !testCase.error) {
    if (context.sendTestCaseSuccess) {
      metrics.series.push({
        metric: `${context.prefix}.testcase.success_count`,
        points: [[context.timestamp, 1]],
        type: 'count',
        tags,
      })
    }
  } else {
    core.error(`FAIL: ${testCase['@_name']}`)
    if (context.sendTestCaseFailure) {
      metrics.series.push({
        metric: `${context.prefix}.testcase.failure_count`,
        points: [[context.timestamp, 1]],
        type: 'count',
        tags,
      })
    }
  }

  const duration = testCase['@_time']
  if (duration > context.filterTestCaseSlowerThan) {
    metrics.distributionPointsSeries.push({
      metric: `${context.prefix}.testcase.duration`,
      points: [[context.timestamp, [duration]]],
      tags,
    })
  }

  return metrics
}

export const unixTime = (date: Date): number => Math.floor(date.getTime() / 1000)
