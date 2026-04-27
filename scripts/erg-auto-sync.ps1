# ============================================================
# ERG 360 - Auto-sync das routines remotas
# Roda 'git pull' e loga resultado.
# ============================================================

$ProjectPath = "C:\Users\eveli\Downloads\evelin-greco 15 COMPLETO"
$LogFile     = Join-Path $ProjectPath "scripts\sync.log"
$MaxLogLines = 500

function Write-SyncLog {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$ts] [$Level] $Message" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

function Trim-SyncLog {
    if (Test-Path $LogFile) {
        $lines = Get-Content $LogFile -Encoding utf8
        if ($lines.Count -gt $MaxLogLines) {
            $lines | Select-Object -Last $MaxLogLines | Set-Content $LogFile -Encoding utf8
        }
    }
}

if (-not (Test-Path $ProjectPath)) {
    Write-SyncLog "Pasta nao encontrada: $ProjectPath" "ERROR"
    exit 1
}

Set-Location $ProjectPath
Write-SyncLog "=== Iniciando sync ==="

if (-not (Test-Path ".git")) {
    Write-SyncLog "Nao eh repositorio git" "ERROR"
    exit 1
}

$dirty = git status --porcelain
if ($dirty) {
    Write-SyncLog "Mudancas locais nao commitadas - pulando pull" "WARN"
    $dirtyStr = ($dirty | Out-String).Trim()
    Write-SyncLog ("Arquivos: " + $dirtyStr) "WARN"
    Trim-SyncLog
    exit 0
}

Write-SyncLog "Buscando do origin/main..."
$fetchOut = git fetch origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-SyncLog ("Erro fetch: " + ($fetchOut | Out-String)) "ERROR"
    Trim-SyncLog
    exit 1
}

$localHash  = (git rev-parse HEAD).Trim()
$remoteHash = (git rev-parse origin/main).Trim()

if ($localHash -eq $remoteHash) {
    Write-SyncLog ("Ja atualizado (HEAD=" + $localHash.Substring(0,7) + ")")
    Trim-SyncLog
    exit 0
}

# Verifica se local eh ancestor do remoto (FF possivel)
git merge-base --is-ancestor HEAD origin/main 2>&1 | Out-Null
$canFF = ($LASTEXITCODE -eq 0)

if (-not $canFF) {
    # Local tem commits que o remoto nao tem - precisa push manual
    $aheadCount = (git rev-list --count origin/main..HEAD).Trim()
    Write-SyncLog ("Local esta " + $aheadCount + " commits ah frente do remoto - push manual necessario") "WARN"
    Trim-SyncLog
    exit 0
}

Write-SyncLog ("Update: " + $localHash.Substring(0,7) + " -> " + $remoteHash.Substring(0,7))
$pullOut = git pull --ff-only origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-SyncLog ("Pull falhou: " + ($pullOut | Out-String)) "ERROR"
    Trim-SyncLog
    exit 1
}

$changedFiles = git diff --name-only "$localHash..$remoteHash"
$nFiles = ($changedFiles | Measure-Object -Line).Lines
Write-SyncLog ("Sync OK - " + $nFiles + " arquivos atualizados")
if ($changedFiles) {
    Write-SyncLog ("Files: " + ($changedFiles -join ", "))
}

# Toast notification (silencia erro se nao suportado)
try {
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $textNodes = $template.GetElementsByTagName("text")
    $null = $textNodes.Item(0).AppendChild($template.CreateTextNode("ERG 360 atualizado"))
    $null = $textNodes.Item(1).AppendChild($template.CreateTextNode("$nFiles arquivos via routine"))
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("ERG 360 Sync").Show([Windows.UI.Notifications.ToastNotification]::new($template))
} catch {}

Trim-SyncLog
exit 0
