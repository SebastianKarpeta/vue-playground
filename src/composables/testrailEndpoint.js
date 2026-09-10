// Tłumaczy URL-e naszego PHP proxy (api/*.php?...) na surowe endpointy
// TestRail API v2 — dokładnie tę samą logikę, jaką mają odpowiednie pliki
// api/*.php, tylko po stronie JS. Używane w trybie Tauri, gdzie zamiast
// PHP odpytujemy TestRail bezpośrednio z Rusta (patrz src-tauri/src/testrail.rs).
export function urlToEndpoint(url) {
  const parsed = new URL(url, window.location.origin)
  const path = parsed.pathname
  const params = parsed.searchParams

  if (path.endsWith('projects.php')) {
    return 'get_projects'
  }

  if (path.endsWith('milestones.php')) {
    const projectId = params.get('project_id')
    return `get_milestones/${projectId}`
  }

  if (path.endsWith('runs.php')) {
    const projectId = params.get('project_id')
    const milestoneId = params.get('milestone_id')
    return `get_runs/${projectId}` + (milestoneId ? `&milestone_id=${milestoneId}` : '')
  }

  if (path.endsWith('tests.php')) {
    const runId = params.get('run_id')
    const limit = params.get('limit') ?? '20'
    const offset = params.get('offset') ?? '0'
    const statusId = params.get('status_id')
    return `get_tests/${runId}&limit=${limit}&offset=${offset}` + (statusId ? `&status_id=${statusId}` : '')
  }

  if (path.endsWith('results.php')) {
    const testId = params.get('test_id')
    return `get_results/${testId}&limit=250`
  }

  if (path.endsWith('case.php')) {
    const caseId = params.get('case_id')
    return `get_case/${caseId}`
  }

  if (path.endsWith('cases.php')) {
    const projectId = params.get('project_id')
    const suiteId = params.get('suite_id')
    const offset = params.get('offset') ?? '0'
    return `get_cases/${projectId}&suite_id=${suiteId}&limit=250&offset=${offset}`
  }

  throw new Error(`Nieznany endpoint dla trybu Tauri: ${url}`)
}
