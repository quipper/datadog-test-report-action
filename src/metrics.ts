import { v1 } from '@datadog/datadog-api-client'
import { JunitXml, TestCase, TestSuite } from './junitxml'

export type Metrics = {
  series: v1.Series[]
  distributionPointsSeries: v1.DistributionPointsSeries[]
}

export const getJunitXmlMetrics = (junitXml: JunitXml): Metrics => {
  const timestamp = unixTime(new Date())
  const testSuites = junitXml.testsuites?.testsuite ?? junitXml.testsuite ?? []
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  for (const testSuite of testSuites) {
    const tsm = getTestSuiteMetrics(testSuite, timestamp)
    metrics.series.push(...tsm.series)
    metrics.distributionPointsSeries.push(...tsm.distributionPointsSeries)
  }
  return metrics
}

const getTestSuiteMetrics = (testSuite: TestSuite, timestamp: number): Metrics => {
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  const tags = [`testsuite_name:${testSuite['@_name']}`]

  metrics.series.push({
    metric: 'testreport.testsuite.count',
    points: [[timestamp, 1]],
    type: 'count',
    tags,
  })
  if (testSuite['@_time'] > 0) {
    metrics.distributionPointsSeries.push({
      metric: 'testreport.testsuite.duration',
      points: [[timestamp, testSuite['@_time']]],
      tags,
    })
  }
  for (const testCase of testSuite.testcase ?? []) {
    const tcm = getTestCaseMetrics(testCase, tags, timestamp)
    metrics.series.push(...tcm.series)
    metrics.distributionPointsSeries.push(...tcm.distributionPointsSeries)
  }

  for (const childTestSuite of testSuite.testsuite ?? []) {
    const tsm = getTestSuiteMetrics(childTestSuite, timestamp)
    metrics.series.push(...tsm.series)
    metrics.distributionPointsSeries.push(...tsm.distributionPointsSeries)
  }
  return metrics
}

const getTestCaseMetrics = (testCase: TestCase, parentTags: string[], timestamp: number): Metrics => {
  const metrics: Metrics = {
    series: [],
    distributionPointsSeries: [],
  }
  const conclusion = testCase.failure ? 'failure' : 'success'
  const tags = [...parentTags, `testcase_name:${testCase['@_name']}`, `testcase_conclusion:${conclusion}`]
  if (testCase['@_classname']) {
    tags.push(`testcase_classname:${testCase['@_classname']}`)
  }
  if (testCase['@_file']) {
    tags.push(`testcase_file:${testCase['@_file']}`)
  }

  metrics.series.push({
    metric: 'testreport.testcase.count',
    points: [[timestamp, 1]],
    type: 'count',
    tags,
  })

  if (testCase['@_time'] > 0) {
    metrics.distributionPointsSeries.push({
      metric: 'testreport.testcase.duration',
      points: [[timestamp, testCase['@_time']]],
      tags,
    })
  }

  return metrics
}

const unixTime = (date: Date): number => Math.floor(date.getTime() / 1000)
