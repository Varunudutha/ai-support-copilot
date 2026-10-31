$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$appPath = Join-Path $root 'web/src/App.tsx'
$authPath = Join-Path $root 'web/src/auth/AuthContext.tsx'

if (-not (Test-Path $appPath) -or -not (Test-Path $authPath)) {
  throw 'Run this script from the ai-support-copilot project root. The web/src files were not found.'
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$app = [System.IO.File]::ReadAllText($appPath) -replace "`r`n", "`n"
$auth = [System.IO.File]::ReadAllText($authPath) -replace "`r`n", "`n"

$importMarker = "import { conversations, type ChartRange } from './data/dashboard'"
$knowledgeImport = "import { KnowledgeBasePage } from './components/knowledge/KnowledgeBasePage'"
if (-not $app.Contains($knowledgeImport)) {
  if (-not $app.Contains($importMarker)) { throw 'Could not find the dashboard import marker in App.tsx. No files were modified.' }
  $app = $app.Replace($importMarker, $importMarker + "`n" + $knowledgeImport)
}

$oldPage = @'
          {activePage === 'Overview' ? (
            <Dashboard range={range} setRange={setRange} search={search} onViewAll={() => navigate('Conversations')} onViewAnalytics={() => navigate('Analytics')} firstName={firstName} />
          ) : (
            <ComingSoonPage title={activePage} onBack={() => navigate('Overview')} />
          )}
'@
$oldPage = $oldPage -replace "`r`n", "`n"
$newPage = @'
          {activePage === 'Overview' ? (
            <Dashboard range={range} setRange={setRange} search={search} onViewAll={() => navigate('Conversations')} onViewAnalytics={() => navigate('Analytics')} firstName={firstName} />
          ) : activePage === 'Knowledge base' ? (
            <KnowledgeBasePage />
          ) : (
            <ComingSoonPage title={activePage} onBack={() => navigate('Overview')} />
          )}
'@
$newPage = $newPage -replace "`r`n", "`n"
if (-not $app.Contains("<KnowledgeBasePage />")) {
  if (-not $app.Contains($oldPage)) { throw 'Could not find the expected page-render block in App.tsx. No files were modified.' }
  $app = $app.Replace($oldPage, $newPage)
}

$oldHeader = "      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')"
$newHeader = @'
      const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
      if (init.body && !headers.has('Content-Type') && !isFormData) headers.set('Content-Type', 'application/json')
'@
$newHeader = ($newHeader -replace "`r`n", "`n").TrimEnd([char[]]@([char]10, [char]13))
if (-not $auth.Contains('const isFormData = typeof FormData')) {
  if (-not $auth.Contains($oldHeader)) { throw 'Could not find the API request header logic in AuthContext.tsx. No files were modified.' }
  $auth = $auth.Replace($oldHeader, $newHeader)
}

[System.IO.File]::WriteAllText($appPath, $app, $utf8)
[System.IO.File]::WriteAllText($authPath, $auth, $utf8)
Write-Host 'Milestone 03 Knowledge Base UI integration applied.' -ForegroundColor Green
Write-Host 'Added the Knowledge Base page route and enabled multipart FormData requests.'
