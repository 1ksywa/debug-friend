# =====================================================================
#  DEBUG Friend ! - lanceur
#  1. choisit un port libre et un jeton secret ;
#  2. demarre le serveur avec les droits administrateur ;
#  3. ouvre l'interface dans le navigateur (sans droits administrateur).
# =====================================================================
$ErrorActionPreference = 'Stop'
$App = $PSScriptRoot

function Fin($message) {
    Write-Host ''
    Write-Host $message -ForegroundColor Yellow
    Write-Host ''
    exit 1
}

try {
    $ecoute = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
    $ecoute.Start()
    $port = $ecoute.LocalEndpoint.Port
    $ecoute.Stop()

    $octets = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($octets)
    $jeton = ([BitConverter]::ToString($octets) -replace '-', '').ToLower()

    Write-Host ''
    Write-Host '  DEBUG Friend !' -ForegroundColor White
    Write-Host '  Windows va demander les droits administrateur : reponds Oui.'
    Write-Host ''

    # Fichiers venus d'Internet (zip) : on retire la marque "telecharge" pour que
    # Windows ne bloque pas les scripts ni l'outil de temperatures.
    try { Get-ChildItem -LiteralPath (Split-Path $App -Parent) -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue } catch { }

    $sid = 'aucun'
    try { $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value } catch { }
    $serveur = Join-Path $App 'serveur.ps1'
    $listeArgs = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Port {1} -Jeton {2} -Sid {3}' -f $serveur, $port, $jeton, $sid
    try {
        Start-Process -FilePath 'powershell.exe' -ArgumentList $listeArgs -Verb RunAs -WindowStyle Minimized | Out-Null
    } catch {
        Fin '  Droits administrateur refuses : DEBUG Friend ! ne peut pas analyser ce PC sans eux.'
    }

    Write-Host '  Demarrage en cours...'
    $pret = $false
    for ($i = 0; $i -lt 240; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $req = [System.Net.WebRequest]::Create(('http://127.0.0.1:{0}/ping' -f $port))
            $req.Proxy = $null
            $req.Timeout = 2000
            $resp = $req.GetResponse()
            $resp.Close()
            $pret = $true
            break
        } catch { }
    }
    if (-not $pret) {
        Fin '  Le logiciel ne repond pas. Regarde le fichier donnees\journal.txt sur la cle, et envoie-le a Claude.'
    }
    Start-Process ('http://127.0.0.1:{0}/?j={1}' -f $port, $jeton) | Out-Null
    Write-Host '  C''est parti ! Cette fenetre va se fermer.'
    Start-Sleep -Seconds 2
    exit 0
} catch {
    Fin ('  Erreur au lancement : ' + $_.Exception.Message)
}
