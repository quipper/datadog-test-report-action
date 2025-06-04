import * as core from '@actions/core'
import * as path from 'path'
import { v1 } from '@datadog/datadog-api-client'
import { Matcher } from './codeowners.js'
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
  codeownersMatcher: Matcher
  testCaseBaseDirectory: string
}

export const getJunitXmlMetrics = (junitXml: JunitXml, context: Context): Metrics => {
  const testSuites = junitXml.testsuites?.testsuite ?? junitXml.testsuite ?? []
  return joinMetrics(...testSuites.map((testSuite) => traverseTestSuite(testSuite, context)))
}

const traverseTestSuite = (testSuite: TestSuite, context: Context): Metrics => {
  const testSuiteMetrics = getTestSuiteMetrics(testSuite, context)

  const nestedTestSuite = testSuite.testsuite ?? []
  const nestedTestSuiteMetrics = nestedTestSuite.map((nestedTestSuite) => traverseTestSuite(nestedTestSuite, context))
  return joinMetrics(testSuiteMetrics, ...nestedTestSuiteMetrics)
}

const getTestSuiteMetrics = (testSuite: TestSuite, context: Context): Metrics => {
  const tags = [...context.tags, `testsuite_name:${testSuite['@_name']}`]
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }

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

  const testCases = testSuite.testcase ?? []
  const testCaseMetrics = testCases.map((testCase) => getTestCaseMetrics(testCase, context))
  return joinMetrics(metrics, ...testCaseMetrics)
}

const getTestCaseMetrics = (testCase: TestCase, context: Context): Metrics => {
  const tags = [...context.tags, `testcase_name:${testCase['@_name']}`]
  if (testCase['@_classname']) {
    tags.push(`testcase_classname:${testCase['@_classname']}`)
  }

  if (testCase['@_file']) {
    tags.push(`testcase_file:${testCase['@_file']}`)
    tags.push(...getOwnerTags(testCase['@_file'], context))
  }

  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
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

const getOwnerTags = (file: string, context: Context): string[] => {
  const canonicalPath = path.join(context.testCaseBaseDirectory, file)
  return context.codeownersMatcher
    .findOwners(canonicalPath)
    .map((owner) => owner.replace(/^@.+?\/|^@/, '')) // Remove leading @organization/
    .map((owner) => `testcase_owner:${owner}`)
}

const joinMetrics = (...metricsArray: Metrics[]): Metrics => {
  const joined: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  for (const metrics of metricsArray) {
    joined.series.push(...metrics.series)
    joined.distributionPointsSeries.push(...metrics.distributionPointsSeries)
  }
  return joined
}
