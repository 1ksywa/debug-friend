# =====================================================================
#  DEBUG Friend ! - serveur local
#  Ecoute uniquement sur 127.0.0.1 (joignable seulement depuis ce PC),
#  avec un jeton secret different a chaque lancement.
#  Sert l'interface (dossier web) et les fonctions de collecte.
# =====================================================================
param(
    [int]$Port,
    [string]$Jeton,
    [string]$Sid
)

$ErrorActionPreference = 'Stop'
$Version = '1.0.4'
$App = $PSScriptRoot
$Racine = Split-Path $App -Parent
$Web = Join-Path $App 'web'
$WebPlein = [System.IO.Path]::GetFullPath($Web).TrimEnd('\') + '\'
$Donnees = Join-Path $Racine 'donnees'
$Journal = Join-Path $Donnees 'journal.txt'
$Temp = Join-Path $env:TEMP ('DEBUGFriend_' + $Jeton.Substring(0, 8))
$Utf8 = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $Donnees | Out-Null
New-Item -ItemType Directory -Force -Path $Temp | Out-Null

# Windows PowerShell 5.1 : evite que les listes deviennent {"value":[...],"Count":n} en JSON
try { Remove-TypeData System.Array -ErrorAction Stop } catch { }

function Ecrire-Journal($m) {
    $l = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
    Write-Host $l
    try {
        if ((Test-Path $Journal) -and ((Get-Item $Journal).Length -gt 1MB)) { Move-Item $Journal ($Journal + '.ancien') -Force }
        [System.IO.File]::AppendAllText($Journal, $l + "`r`n", $Utf8)
    } catch { }
}

. (Join-Path $App 'collecte.ps1')
Definir-Utilisateur $Sid

$Host.UI.RawUI.WindowTitle = 'DEBUG Friend ! - ne ferme pas cette fenetre'
Write-Host ''
Write-Host '  DEBUG Friend ! tourne.' -ForegroundColor White
Write-Host '  Ne ferme pas cette fenetre pendant que tu utilises le logiciel.' -ForegroundColor White
Write-Host '  Pour quitter : bouton Quitter dans le navigateur.' -ForegroundColor White
Write-Host ''

$Types = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
    '.otf'  = 'font/otf'
    '.woff2' = 'font/woff2'
    '.txt'  = 'text/plain; charset=utf-8'
}

$Csp = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

function Repondre($ctx, [int]$code, [string]$type, [byte[]]$octets) {
    $r = $ctx.Response
    $r.StatusCode = $code
    $r.ContentType = $type
    $r.Headers['Cache-Control'] = 'no-store'
    $r.Headers['X-Content-Type-Options'] = 'nosniff'
    $r.Headers['Content-Security-Policy'] = $Csp
    $r.Headers['Referrer-Policy'] = 'no-referrer'
    if ($null -eq $octets) { $octets = New-Object byte[] 0 }
    $r.ContentLength64 = $octets.Length
    if ($octets.Length -gt 0) { $r.OutputStream.Write($octets, 0, $octets.Length) }
}

function Repondre-Json($ctx, [int]$code, $objet) {
    $json = ConvertTo-Json -InputObject $objet -Depth 12 -Compress
    Repondre $ctx $code 'application/json; charset=utf-8' ($Utf8.GetBytes([string]$json))
}

function Repondre-Texte($ctx, [int]$code, [string]$texte) {
    Repondre $ctx $code 'text/plain; charset=utf-8' ($Utf8.GetBytes($texte))
}

function Lire-Corps($ctx) {
    $req = $ctx.Request
    if (-not $req.HasEntityBody) { return '' }
    if ($req.ContentLength64 -gt 30MB) { throw 'Requete trop grosse' }
    $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
    try { return $sr.ReadToEnd() } finally { $sr.Close() }
}

function Nom-Valide([string]$nom) {
    return ($nom -match '^[a-z0-9][a-z0-9_\-]{0,80}\.(json|dfx)$')
}

function Servir-Fichier($ctx, [string]$chemin) {
    if ($chemin -eq '/' -or $chemin -eq '') { $chemin = '/index.html' }
    $rel = [System.Uri]::UnescapeDataString($chemin.TrimStart('/')).Replace('/', '\')
    $plein = [System.IO.Path]::GetFullPath((Join-Path $Web $rel))
    if (-not $plein.StartsWith($WebPlein, [System.StringComparison]::OrdinalIgnoreCase)) { Repondre-Texte $ctx 403 'Interdit'; return }
    if (-not (Test-Path -LiteralPath $plein -PathType Leaf)) { Repondre-Texte $ctx 404 'Introuvable'; return }
    $ext = [System.IO.Path]::GetExtension($plein).ToLower()
    $type = 'application/octet-stream'
    if ($Types.ContainsKey($ext)) { $type = $Types[$ext] }
    Repondre $ctx 200 $type ([System.IO.File]::ReadAllBytes($plein))
}

# ------------------------------------------------------------------ actions autorisees
# Le logiciel n'ouvre que des fenetres de Windows ou des outils connus.
# Les outils qui reparent (sfc, DISM, chkdsk) s'ouvrent dans une fenetre visible.
$Actions = @{
    'maj'             = @('ms-settings:windowsupdate')
    'maj-options'     = @('ms-settings:windowsupdate-options')
    'securite'        = @('windowsdefender:')
    'demarrage'       = @('ms-settings:startupapps')
    'affichage'       = @('ms-settings:display')
    'affichage-avance' = @('ms-settings:display-advanced')
    'graphismes'      = @('ms-settings:display-advancedgraphics')
    'son'             = @('ms-settings:sound')
    'bluetooth'       = @('ms-settings:bluetooth')
    'imprimantes'     = @('ms-settings:printers')
    'wifi'            = @('ms-settings:network-wifi')
    'reseau'          = @('ms-settings:network-status')
    'webcam'          = @('ms-settings:privacy-webcam')
    'micro'           = @('ms-settings:privacy-microphone')
    'alimentation'    = @('ms-settings:powersleep')
    'stockage'        = @('ms-settings:storagesense')
    'applis'          = @('ms-settings:appsfeatures')
    'gamebar'         = @('ms-settings:gaming-gamebar')
    'capture'         = @('ms-settings:gaming-gamedvr')
    'modejeu'         = @('ms-settings:gaming-gamemode')
    'activation'      = @('ms-settings:activation')
    'propos'          = @('ms-settings:about')
    'chiffrement'     = @('ms-settings:deviceencryption')
    'comptes'         = @('ms-settings:yourinfo')
    'onedrive'        = @('ms-settings:backup')
    'gestionnaire'    = @('devmgmt.msc')
    'fiabilite'       = @('perfmon.exe', '/rel')
    'nettoyage'       = @('cleanmgr.exe')
    'test-memoire'    = @('mdsched.exe')
    'options-alim'    = @('control.exe', 'powercfg.cpl')
    'pare-feu'        = @('control.exe', 'firewall.cpl')
    'internet'        = @('control.exe', 'inetcpl.cpl,,4')
    'sfc'             = @('cmd.exe', '/k echo Reparation des fichiers de Windows (sfc /scannow). Ne ferme pas cette fenetre. & sfc /scannow')
    'dism'            = @('cmd.exe', '/k echo Reparation de l''image de Windows (DISM). Internet necessaire. Ne ferme pas cette fenetre. & DISM /Online /Cleanup-Image /RestoreHealth')
    'chkdsk'          = @('cmd.exe', '/k echo Analyse du disque C: (lecture seule). & chkdsk C: /scan')
    'chkdsk-reparer'  = @('cmd.exe', '/k echo Reparation du disque C: au prochain redemarrage. Reponds O (ou Y) puis redemarre le PC. & chkdsk C: /f')
    'dns'             = @('cmd.exe', '/k echo Vidage du cache DNS. & ipconfig /flushdns')
    'spouleur'        = @('cmd.exe', '/k echo Redemarrage du service d''impression. & net stop spooler & net start spooler')
}

function Lancer-Action([string]$id) {
    if (-not $Actions.ContainsKey($id)) { throw ('Action inconnue : ' + $id) }
    $a = $Actions[$id]
    if ($a.Count -eq 1) { Start-Process -FilePath $a[0] | Out-Null }
    else { Start-Process -FilePath $a[0] -ArgumentList $a[1] | Out-Null }
}

function Rapport-Batterie {
    $f = Join-Path $Temp 'rapport_batterie.html'
    powercfg /batteryreport /output "$f" | Out-Null
    if (Test-Path $f) { Start-Process -FilePath $f | Out-Null; return $true }
    return $false
}

# ------------------------------------------------------------------ sauvegardes chiffrees
# Dossier "Mon Drive" de Google Drive pour ordinateur (lecteur G: ou dossier en miroir)
function Trouver-Drive {
    $lettres = @()
    try { $lettres += @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'Google Drive' -and $_.DriveLetter } | ForEach-Object { [string]$_.DriveLetter }) } catch { }
    try { $lettres += @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object { [string]$_.Name }) } catch { }
    foreach ($l in ($lettres | Select-Object -Unique)) {
        if ($l.Length -ne 1) { continue }
        foreach ($sous in @('Mon Drive', 'My Drive')) {
            $p = '{0}:\{1}' -f $l, $sous
            if (Test-Path -LiteralPath $p) { return $p }
        }
    }
    foreach ($sous in @('Mon Drive', 'My Drive', 'Google Drive\Mon Drive', 'Google Drive\My Drive', 'Google Drive')) {
        $p = Join-Path $script:Util.profil $sous
        if (Test-Path -LiteralPath $p) { return $p }
    }
    return $null
}

# Sauvegardes trouvees (cle DEBUG-SECOURS et Google Drive), la plus recente d'abord
function Lister-Sauvegardes {
    $sources = @()
    try { foreach ($v in @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'DEBUG-SECOURS' -and $_.DriveLetter })) { $sources += @{ type = 'cle'; dossier = ('{0}:\DEBUG Friend - sauvegardes' -f $v.DriveLetter) } } } catch { }
    $d = Trouver-Drive
    if ($d) { $sources += @{ type = 'drive'; dossier = (Join-Path $d 'DEBUG Friend - sauvegardes') } }
    $liste = @()
    foreach ($s in $sources) {
        if (-not (Test-Path -LiteralPath $s.dossier)) { continue }
        foreach ($sd in @(Get-ChildItem -LiteralPath $s.dossier -Directory | Sort-Object Name -Descending)) {
            if (Test-Path -LiteralPath (Join-Path $sd.FullName 'compte.json')) {
                $liste += [ordered]@{ type = $s.type; nom = $sd.Name; chemin = $sd.FullName }
            }
        }
    }
    return @($liste | Sort-Object { $_.nom } -Descending)
}

function Restaurer {
    if (Test-Path -LiteralPath (Join-Path $Donnees 'compte.json')) { throw 'Un compte existe deja dans ce dossier : rien n''a ete remplace.' }
    $l = @(Lister-Sauvegardes)
    if ($l.Count -eq 0) { throw 'Aucune sauvegarde trouvee (ni Google Drive, ni cle DEBUG-SECOURS).' }
    $src = $l[0]
    $n = 0
    foreach ($f in @(Get-ChildItem -LiteralPath $src.chemin -File)) {
        if (Nom-Valide $f.Name) { Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $Donnees $f.Name) -Force; $n++ }
    }
    Ecrire-Journal ('Donnees restaurees depuis ' + $src.type + ' (' + $src.nom + ', ' + $n + ' fichiers)')
    return [ordered]@{ ok = $true; source = $src.type; date = $src.nom; fichiers = $n }
}

function Sauvegarder($versDrive) {
    $res = [ordered]@{ cle = $null; drive = $null; erreurs = @() }
    $fichiers = @(Get-ChildItem $Donnees -File | Where-Object { $_.Name -match '\.(json|dfx)$' })
    if ($fichiers.Count -eq 0) { $res.erreurs += 'Rien a sauvegarder'; return $res }
    $horo = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $cibles = @()
    $secours = @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'DEBUG-SECOURS' -and $_.DriveLetter })
    foreach ($v in $secours) { $cibles += @{ type = 'cle'; dossier = ('{0}:\DEBUG Friend - sauvegardes' -f $v.DriveLetter) } }
    if ($versDrive) {
        $trouve = Trouver-Drive
        if ($trouve) { $cibles += @{ type = 'drive'; dossier = (Join-Path $trouve 'DEBUG Friend - sauvegardes') } }
        else { $res.erreurs += 'Google Drive introuvable sur ce PC' }
    }
    foreach ($c in $cibles) {
        try {
            $dest = Join-Path $c.dossier $horo
            New-Item -ItemType Directory -Force -Path $dest | Out-Null
            foreach ($f in $fichiers) { Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $dest $f.Name) -Force }
            $anciens = @(Get-ChildItem $c.dossier -Directory | Sort-Object Name -Descending | Select-Object -Skip 10)
            foreach ($a in $anciens) { Remove-Item -LiteralPath $a.FullName -Recurse -Force }
            if ($c.type -eq 'cle') { $res.cle = $dest } else { $res.drive = $dest }
        } catch { $res.erreurs += ('Copie impossible vers ' + $c.dossier + ' : ' + $_.Exception.Message) }
    }
    if ($secours.Count -eq 0) { $res.erreurs += 'Cle DEBUG-SECOURS non branchee' }
    return $res
}

# ------------------------------------------------------------------ traitement d'une requete API
function Traiter-Api($ctx, [string]$chemin) {
    $req = $ctx.Request
    $j = $req.Headers['X-Jeton']
    if ($j -ne $Jeton) { Repondre-Texte $ctx 401 'Jeton invalide'; return }
    $methode = $req.HttpMethod
    $q = $req.QueryString
    switch ($chemin) {
        '/api/infos' {
            $lhm = Test-Path (Join-Path $Racine 'outils\LibreHardwareMonitor\LibreHardwareMonitorLib.dll')
            Repondre-Json $ctx 200 ([ordered]@{ version = $Version; lhmPresent = $lhm; admin = (EstAdmin); modules = $script:ListeModules })
            return
        }
        '/api/collecte' {
            $corps = Lire-Corps $ctx | ConvertFrom-Json
            $opt = [pscustomobject]@{ complete = [bool]$corps.complete; lhm = [bool]$corps.lhm }
            $res = Collecter ([string]$corps.module) $opt
            foreach ($e in $res.erreurs) { Ecrire-Journal ('Module ' + $res.module + ' : ' + $e) }
            Repondre-Json $ctx 200 $res
            return
        }
        '/api/fichier' {
            $nom = [string]$q['nom']
            if (-not (Nom-Valide $nom)) { Repondre-Texte $ctx 400 'Nom invalide'; return }
            $p = Join-Path $Donnees $nom
            if ($methode -eq 'GET') {
                if (Test-Path -LiteralPath $p) { Repondre $ctx 200 'text/plain; charset=utf-8' ([System.IO.File]::ReadAllBytes($p)) }
                else { Repondre-Texte $ctx 404 'Introuvable' }
                return
            }
            if ($methode -eq 'POST') {
                $texte = Lire-Corps $ctx
                $tmp = $p + '.tmp'
                [System.IO.File]::WriteAllText($tmp, $texte, $Utf8)
                if (Test-Path -LiteralPath $p) {
                    # [NullString]::Value : sinon PowerShell passe "" au lieu de null (pas de copie de secours voulue)
                    try { [System.IO.File]::Replace($tmp, $p, [NullString]::Value) }
                    catch { [System.IO.File]::Copy($tmp, $p, $true); [System.IO.File]::Delete($tmp) }
                } else { [System.IO.File]::Move($tmp, $p) }
                Repondre-Json $ctx 200 @{ ok = $true }
                return
            }
            if ($methode -eq 'DELETE') {
                if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }
                Repondre-Json $ctx 200 @{ ok = $true }
                return
            }
            Repondre-Texte $ctx 405 'Methode interdite'
            return
        }
        '/api/liste' {
            $noms = @(Get-ChildItem $Donnees -File | Where-Object { Nom-Valide $_.Name } | ForEach-Object { $_.Name })
            Repondre-Json $ctx 200 ([ordered]@{ fichiers = @($noms) })
            return
        }
        '/api/action' {
            $corps = Lire-Corps $ctx | ConvertFrom-Json
            $id = [string]$corps.id
            if ($id -eq 'rapport-batterie') {
                $ok = Rapport-Batterie
                Repondre-Json $ctx 200 @{ ok = $ok }
                return
            }
            Lancer-Action $id
            Ecrire-Journal ('Action ouverte : ' + $id)
            Repondre-Json $ctx 200 @{ ok = $true }
            return
        }
        '/api/sauvegarde' {
            $corps = Lire-Corps $ctx | ConvertFrom-Json
            $res = Sauvegarder ([bool]$corps.drive)
            Repondre-Json $ctx 200 $res
            return
        }
        '/api/restaurer' {
            if ($methode -eq 'GET') {
                $l = @(Lister-Sauvegardes)
                $info = [ordered]@{ disponible = ($l.Count -gt 0); source = $null; date = $null; compteIci = (Test-Path -LiteralPath (Join-Path $Donnees 'compte.json')) }
                if ($l.Count -gt 0) { $info.source = $l[0].type; $info.date = $l[0].nom }
                Repondre-Json $ctx 200 $info
                return
            }
            Repondre-Json $ctx 200 (Restaurer)
            return
        }
        '/api/journal' {
            $corps = Lire-Corps $ctx | ConvertFrom-Json
            Ecrire-Journal ('Interface : ' + (Txt $corps.message 500))
            Repondre-Json $ctx 200 @{ ok = $true }
            return
        }
        '/api/ping' {
            Repondre-Json $ctx 200 @{ ok = $true }
            return
        }
        '/api/quitter' {
            Repondre-Json $ctx 200 @{ ok = $true }
            $script:Arreter = $true
            return
        }
        default { Repondre-Texte $ctx 404 'Introuvable' }
    }
}

# ------------------------------------------------------------------ boucle principale
$script:Arreter = $false
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add(('http://127.0.0.1:{0}/' -f $Port))
$derniere = Get-Date
try {
    $listener.Start()
    Ecrire-Journal ('Demarrage version ' + $Version + ' sur le port ' + $Port + $(if ($script:Util.autre) { ' (administrateur different de l''utilisateur)' } else { '' }))
    while (-not $script:Arreter) {
        $att = $listener.BeginGetContext($null, $null)
        while (-not $att.AsyncWaitHandle.WaitOne(1000)) {
            if (((Get-Date) - $derniere).TotalMinutes -gt 20) {
                Ecrire-Journal 'Aucune activite depuis 20 minutes : arret.'
                $script:Arreter = $true
                break
            }
        }
        if ($script:Arreter) { break }
        $ctx = $listener.EndGetContext($att)
        $derniere = Get-Date
        try {
            $hote = [string]$ctx.Request.Headers['Host']
            if ($hote -ne ('127.0.0.1:{0}' -f $Port)) { Repondre-Texte $ctx 403 'Hote refuse' }
            else {
                $chemin = $ctx.Request.Url.AbsolutePath
                if ($chemin -eq '/ping') { Repondre-Texte $ctx 200 'ok' }
                elseif ($chemin.StartsWith('/api/')) { Traiter-Api $ctx $chemin }
                else { Servir-Fichier $ctx $chemin }
            }
        } catch {
            $msg = $_.Exception.Message
            Ecrire-Journal ('Erreur sur ' + $ctx.Request.Url.AbsolutePath + ' : ' + $msg)
            try { Repondre-Json $ctx 500 @{ erreur = $msg } } catch { }
        } finally {
            try { $ctx.Response.Close() } catch { }
        }
    }
} catch {
    Ecrire-Journal ('Erreur grave du serveur : ' + $_.Exception.Message)
} finally {
    try { $listener.Stop(); $listener.Close() } catch { }
    try { Fermer-LHM } catch { }
    try { Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue } catch { }
    Ecrire-Journal 'Arret.'
}
