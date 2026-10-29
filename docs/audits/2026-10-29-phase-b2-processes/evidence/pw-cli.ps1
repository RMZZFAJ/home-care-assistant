# Documentary browser helper. Artifacts stay inside this audit directory.
Push-Location -LiteralPath $PSScriptRoot
$auditRuntime = 'C:\Users\renat\AppData\Local\home-care-assistant\runtime\node-v24.22.0-win-x64'
$env:PATH = "$auditRuntime;$env:PATH"
try {
  & "$auditRuntime\node.exe" 'C:\Users\renat\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js' exec --yes --package=@playwright/cli -- playwright-cli @args
  $auditExit = $LASTEXITCODE
} finally {
  Pop-Location
}
exit $auditExit
