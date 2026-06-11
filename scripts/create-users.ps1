# Cria os 3 usuarios de teste via GoTrue Admin API
# Uso: .\scripts\create-users.ps1

$ServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJleHAiOjk5OTk5OTk5OTl9.jcTW57KSJMhPD22vLF22Hgd7NdeZGIlTBX4-2NmQ3jM"
$AuthUrl    = "http://localhost:9999/admin/users"
$Headers    = @{
    "apikey"        = $ServiceKey
    "Authorization" = "Bearer $ServiceKey"
    "Content-Type"  = "application/json"
}

$Users = @(
    @{ email = "ana.botanica@plantmap.test";  password = "Plantmap@123"; full_name = "Ana Botanica"  }
    @{ email = "carlos.verde@plantmap.test";  password = "Plantmap@123"; full_name = "Carlos Verde"  }
    @{ email = "julia.flora@plantmap.test";   password = "Plantmap@123"; full_name = "Julia Flora"   }
)

Write-Host ""
Write-Host "=== Aguardando GoTrue ficar pronto... ===" -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $health = Invoke-RestMethod "http://localhost:9999/health" -ErrorAction Stop
        if ($health.version) { $ready = $true; break }
    } catch {
        Start-Sleep 2
    }
}

if (-not $ready) {
    Write-Host "GoTrue nao respondeu. Verifique os containers." -ForegroundColor Red
    exit 1
}

Write-Host "GoTrue pronto!" -ForegroundColor Green
Write-Host ""

foreach ($u in $Users) {
    $body = @{
        email          = $u.email
        password       = $u.password
        email_confirm  = $true
        user_metadata  = @{ full_name = $u.full_name }
    } | ConvertTo-Json -Depth 3

    try {
        $res = Invoke-RestMethod -Method Post -Uri $AuthUrl -Headers $Headers -Body $body -ErrorAction Stop
        Write-Host "OK  $($u.email)  id: $($res.id)" -ForegroundColor Green
    } catch {
        $raw = $_.ErrorDetails.Message
        try {
            $msg = $raw | ConvertFrom-Json
            if ($raw -match "already") {
                Write-Host "SKIP  $($u.email)  ja existe" -ForegroundColor Yellow
            } else {
                Write-Host "ERRO  $($u.email)  $($msg.msg)" -ForegroundColor Red
            }
        } catch {
            Write-Host "ERRO  $($u.email)  $raw" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Credenciais de teste ===" -ForegroundColor Cyan
Write-Host "Email                              Senha"
Write-Host "---------------------------------- ------------"
foreach ($u in $Users) {
    Write-Host "$($u.email.PadRight(35)) $($u.password)"
}
Write-Host ""
