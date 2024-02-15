# datadog-test-report-action [![ts](https://github.com/quipper/datadog-test-report-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/quipper/datadog-test-report-action/actions/workflows/ts.yaml)

This is an action to send test report to Datadog.
It supports the JUnit XML format.

## Getting Started

To send the test report to Datadog,

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: yarn test
      - uses: quipper/datadog-test-report-action@v1
        with:
          junit-xml-path: '**/junit.xml'
```

## Metrics

All metrics have the following tags:

- `repository_owner`
- `repository_name`
- `workflow_name`

### `testreport.testsuite.count` (count)

This metric represents the number of test suites.
It has the following tags:

- `testsuite_name`

### `testreport.testsuite.duration` (distribution)

This metric represents the duration of test suites in seconds.
It has the following tags:

- `testsuite_name`

### `testreport.testcase.success_count` (count)

This metric represents the number of succeeded test cases.
It has the following tags:

- `testcase_name`
- `testcase_classname`
- `testcase_file`

This actions sends **only failed test cases by default**.
You can set `send-test-case-success` to send all test cases.
:warning: It may increase the custom metrics cost.

```yaml
- uses: quipper/datadog-test-report-action@v1
  with:
    junit-xml-path: '**/junit.xml'
    send-test-case-success: true
```

### `testreport.testcase.failure_count` (count)

This metric represents the number of failed test cases.
It has the following tags:

- `testcase_name`
- `testcase_classname`
- `testcase_file`

### `testreport.testcase.duration` (distribution)

This metric represents the duration of test cases in seconds.
It has the following tags:

- `testcase_name`
- `testcase_conclusion` (`success` or `failure`)
- `testcase_classname`
- `testcase_file`

This action sends test cases **slower than 1 second by default**.
You can set `filter-test-case-slower-than` to send all test cases.
:warning: It may increase the custom metrics cost.

```yaml
- uses: quipper/datadog-test-report-action@v1
  with:
    junit-xml-path: '**/junit.xml'
    filter-test-case-slower-than: 0
```

## Specification

### Inputs

| Name                           | Default      | Description                                              |
| ------------------------------ | ------------ | -------------------------------------------------------- |
| `junit-xml-path`               | (required)   | Glob pattern to the JUnit XML file(s)                    |
| `metric-name-prefix`           | `testreport` | Prefix of the name of metrics                            |
| `filter-test-case-slower-than` | 1            | Filter test cases slower than the threshold (in seconds) |
| `send-test-case-success`       | false        | Send succeeded test cases                                |
| `send-test-case-failure`       | true         | Send failed test cases                                   |
| `datadog-api-key`              | -            | Datadog API key                                          |
| `datadog-site`                 | -            | Datadog site                                             |
| `datadog-tags`                 | -            | Datadog tags                                             |

### Outputs

None.
