import { describe, it, expect } from 'vitest'
import { urlToEndpoint } from '../../composables/testrailEndpoint'

describe('urlToEndpoint', () => {
  it('projects.php -> get_projects (bez parametrów)', () => {
    expect(urlToEndpoint('http://test/api/projects.php')).toBe('get_projects')
  })

  it('milestones.php -> get_milestones/{project_id}', () => {
    expect(urlToEndpoint('http://test/api/milestones.php?project_id=5')).toBe('get_milestones/5')
  })

  it('runs.php bez milestone_id -> get_runs/{project_id}', () => {
    expect(urlToEndpoint('http://test/api/runs.php?project_id=5')).toBe('get_runs/5')
  })

  it('runs.php z milestone_id -> get_runs/{project_id}&milestone_id={id}', () => {
    expect(urlToEndpoint('http://test/api/runs.php?project_id=5&milestone_id=13')).toBe(
        'get_runs/5&milestone_id=13'
    )
  })

  it('tests.php z domyślnym limit/offset -> get_tests/{run_id}&limit=20&offset=0', () => {
    expect(urlToEndpoint('http://test/api/tests.php?run_id=241')).toBe('get_tests/241&limit=20&offset=0')
  })

  it('tests.php z jawnym limit/offset i status_id', () => {
    expect(urlToEndpoint('http://test/api/tests.php?run_id=241&offset=20&limit=50&status_id=5')).toBe(
        'get_tests/241&limit=50&offset=20&status_id=5'
    )
  })

  it('results.php -> get_results/{test_id}&limit=250', () => {
    expect(urlToEndpoint('http://test/api/results.php?test_id=99')).toBe('get_results/99&limit=250')
  })

  it('case.php -> get_case/{case_id}', () => {
    expect(urlToEndpoint('http://test/api/case.php?case_id=28480')).toBe('get_case/28480')
  })

  it('cases.php z domyślnym offset -> get_cases/{project_id}&suite_id={id}&limit=250&offset=0', () => {
    expect(urlToEndpoint('http://test/api/cases.php?project_id=29&suite_id=84')).toBe(
        'get_cases/29&suite_id=84&limit=250&offset=0'
    )
  })

  it('cases.php z jawnym offset', () => {
    expect(urlToEndpoint('http://test/api/cases.php?project_id=29&suite_id=84&offset=250')).toBe(
        'get_cases/29&suite_id=84&limit=250&offset=250'
    )
  })

  it('nieznany endpoint rzuca czytelny błąd', () => {
    expect(() => urlToEndpoint('http://test/api/unknown.php')).toThrow(/Nieznany endpoint/)
  })
})
