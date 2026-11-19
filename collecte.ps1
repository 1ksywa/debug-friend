# =====================================================================
#  DEBUG Friend ! - collecte des informations Windows (LECTURE SEULE)
#  Chaque module renvoie un objet simple, converti en JSON par le serveur.
#  Aucun module ne modifie le PC.
# =====================================================================

$script:ErreursModule = New-Object System.Collections.ArrayList

# Utilisateur reel du PC. Si l'administrateur est un AUTRE compte (compte standard
# + mot de passe admin), le serveur tourne sous cet autre compte : on lit alors
# le registre et les dossiers de l'utilisateur qui a lance le logiciel.
$script:Util = [ordered]@{ hkcu = 'HKCU:'; nom = $env:USERNAME; profil = $env:USERPROFILE; local = $env:LOCALAPPDATA; temp = $env:TEMP; autre = $false }

function Definir-Utilisateur([string]$sid) {
    if (-not $sid -or $sid -notmatch '^S-1-[0-9-]+$') { return }
    $moi = ''
    try { $moi = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value } catch { }
    if ($sid -eq $moi) { return }
    $reg = 'Registry::HKEY_USERS\' + $sid
    if (-not (Test-Path $reg)) { return }
    $script:Util.hkcu = $reg
    $script:Util.autre = $true
    try { $script:Util.nom = (((New-Object Security.Principal.SecurityIdentifier($sid)).Translate([Security.Principal.NTAccount]).Value) -split '\\')[-1] } catch { }
    $pi = $null
    try { $pi = (Get-ItemProperty ('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\' + $sid) -ErrorAction Stop).ProfileImagePath } catch { }
    if ($pi) {
        $pi = [Environment]::ExpandEnvironmentVariables([string]$pi)
        $script:Util.profil = $pi
        $script:Util.local = Join-Path $pi 'AppData\Local'
        $script:Util.temp = Join-Path $pi 'AppData\Local\Temp'
    }
}

function RegU([string]$chemin) { return ($script:Util.hkcu + '\' + $chemin) }

function Noter-Erreur($quoi, $err) {
    $m = $quoi + ' : '
    if ($err -and $err.Exception) { $m += $err.Exception.Message } else { $m += [string]$err }
    [void]$script:ErreursModule.Add((Txt $m 300))
}

function Txt($s, $n = 300) {
    if ($null -eq $s) { return $null }
    $s = ([string]$s) -replace '\s+', ' '
    $s = $s.Trim()
    if ($s.Length -gt $n) { return $s.Substring(0, $n) + '...' }
    return $s
}

function D($d) {
    if ($null -eq $d) { return $null }
    if ($d -is [datetime]) { return $d.ToString('yyyy-MM-ddTHH:mm:ss') }
    return [string]$d
}

function Ev($filtre, $max = 200) {
    try { return @(Get-WinEvent -FilterHashtable $filtre -MaxEvents $max -ErrorAction Stop) } catch { return @() }
}

function Run-Utf8([scriptblock]$b) {
    $prev = [Console]::OutputEncoding
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; return (& $b) } finally { [Console]::OutputEncoding = $prev }
}

function Arrondi($v, $n = 1) {
    if ($null -eq $v) { return $null }
    try { return [math]::Round([double]$v, $n) } catch { return $null }
}

function EstAdmin {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ---------------------------------------------------------------- systeme
function M_systeme($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $os = Get-CimInstance Win32_OperatingSystem
    $cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    $cs = Get-CimInstance Win32_ComputerSystem
    $csp = Get-CimInstance Win32_ComputerSystemProduct
    $bios = Get-CimInstance Win32_BIOS
    $bb = Get-CimInstance Win32_BaseBoard
    $encl = Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1
    $hb = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power').HiberbootEnabled
    $lic = $null
    try { $lic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction Stop | Where-Object { $_.Name -like 'Windows*' } | Select-Object -First 1 } catch { Noter-Erreur 'licence' $_ }
    $chassis = @()
    if ($encl -and $encl.ChassisTypes) { $chassis = @($encl.ChassisTypes | ForEach-Object { [int]$_ }) }
    $portable = $false
    foreach ($c in $chassis) { if (@(8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32) -contains $c) { $portable = $true } }
    $bat = Get-CimInstance Win32_Battery | Select-Object -First 1
    if ($bat) { $portable = $true }
    $heures = $null
    if ($os -and $os.LastBootUpTime) { $heures = Arrondi (((Get-Date) - $os.LastBootUpTime).TotalHours) 1 }
    $build = 0
    try { $build = [int]$cv.CurrentBuild } catch { }
    $ubr = 0
    try { $ubr = [int]$cv.UBR } catch { }
    return [ordered]@{
        admin              = (EstAdmin)
        fabricant          = (Txt $cs.Manufacturer)
        modele             = (Txt $cs.Model)
        nomCommercial      = (Txt $csp.Version)
        typeMachine        = (Txt $csp.Name)
        famille            = (Txt $cs.SystemFamily)
        nomPC              = $env:COMPUTERNAME
        utilisateur        = $script:Util.nom
        domaine            = [bool]$cs.PartOfDomain
        windowsNom         = (Txt $os.Caption)
        windowsVersion     = (Txt $cv.DisplayVersion)
        build              = $build
        ubr                = $ubr
        edition            = (Txt $cv.EditionID)
        architecture       = (Txt $os.OSArchitecture)
        langue             = (Get-Culture).Name
        installe           = (D $os.InstallDate)
        dernierDemarrage   = (D $os.LastBootUpTime)
        heuresAllume       = $heures
        demarrageRapide    = ($hb -eq 1)
        carteMereFabricant = (Txt $bb.Manufacturer)
        carteMereModele    = (Txt $bb.Product)
        biosFabricant      = (Txt $bios.Manufacturer)
        biosVersion        = (Txt $bios.SMBIOSBIOSVersion)
        biosDate           = (D $bios.ReleaseDate)
        numeroSerie        = (Txt $bios.SerialNumber)
        serieCarteMere     = (Txt $bb.SerialNumber)
        uuid               = (Txt $csp.UUID)
        portable           = $portable
        chassis            = @($chassis)
        hyperviseur        = [bool]$cs.HypervisorPresent
        licenceStatut      = $(if ($lic) { [int]$lic.LicenseStatus } else { $null })
        licenceNom         = $(if ($lic) { Txt $lic.Name } else { $null })
        ramTotaleGo        = (Arrondi ($cs.TotalPhysicalMemory / 1GB) 1)
        profilTemporaire   = ([string]$script:Util.profil -match '\\TEMP(\.[^\\]*)?$')
        maintenant         = (D (Get-Date))
    }
}

# ---------------------------------------------------------------- processeur et memoire
function M_cpu_ram($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    $os = Get-CimInstance Win32_OperatingSystem
    $cs = Get-CimInstance Win32_ComputerSystem
    $slots = (Get-CimInstance Win32_PhysicalMemoryArray | Where-Object { $_.Use -eq 3 } | Measure-Object MemoryDevices -Sum).Sum
    $barrettes = @()
    foreach ($m in @(Get-CimInstance Win32_PhysicalMemory)) {
        $barrettes += [ordered]@{
            emplacement   = (Txt $m.DeviceLocator)
            fabricant     = (Txt $m.Manufacturer)
            reference     = (Txt $m.PartNumber)
            go            = (Arrondi ($m.Capacity / 1GB) 0)
            vitessePrevue = $m.Speed
            vitesseReelle = $m.ConfiguredClockSpeed
            typeSmbios    = $m.SMBIOSMemoryType
        }
    }
    $totale = $null
    $libre = $null
    if ($cs) { $totale = Arrondi ($cs.TotalPhysicalMemory / 1GB) 1 }
    if ($os) { $libre = Arrondi ($os.FreePhysicalMemory / 1MB) 1 }
    $pct = $null
    if ($totale -and $libre -ne $null -and $totale -gt 0) { $pct = Arrondi (100 * ($totale - $libre) / $totale) 0 }
    return [ordered]@{
        cpuNom        = (Txt $cpu.Name)
        cpuFabricant  = (Txt $cpu.Manufacturer)
        coeurs        = $cpu.NumberOfCores
        threads       = $cpu.NumberOfLogicalProcessors
        frequenceMax  = $cpu.MaxClockSpeed
        chargeCpu     = $cpu.LoadPercentage
        ramTotaleGo   = $totale
        ramLibreGo    = $libre
        ramUtilisee   = $pct
        emplacements  = $slots
        barrettes     = @($barrettes)
    }
}

# ---------------------------------------------------------------- cartes graphiques et ecrans
$script:CsEcrans = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class DebugFriendEcrans {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DISPLAY_DEVICE {
        public int cb;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string DeviceName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
        public int StateFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DEVMODE {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
        public short dmSpecVersion; public short dmDriverVersion; public short dmSize; public short dmDriverExtra;
        public int dmFields; public int dmPositionX; public int dmPositionY; public int dmDisplayOrientation; public int dmDisplayFixedOutput;
        public short dmColor; public short dmDuplex; public short dmYResolution; public short dmTTOption; public short dmCollate;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
        public short dmLogPixels; public int dmBitsPerPel; public int dmPelsWidth; public int dmPelsHeight;
        public int dmDisplayFlags; public int dmDisplayFrequency;
        public int dmICMMethod; public int dmICMIntent; public int dmMediaType; public int dmDitherType;
        public int dmReserved1; public int dmReserved2; public int dmPanningWidth; public int dmPanningHeight;
    }
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplayDevices(string lpDevice, uint iDevNum, ref DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
    public static string[] Liste() {
        List<string> res = new List<string>();
        for (uint i = 0; i < 16; i++) {
            DISPLAY_DEVICE d = new DISPLAY_DEVICE();
            d.cb = Marshal.SizeOf(typeof(DISPLAY_DEVICE));
            if (!EnumDisplayDevices(null, i, ref d, 0)) break;
            if ((d.StateFlags & 1) == 0) continue;
            DEVMODE cur = new DEVMODE();
            cur.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE));
            if (!EnumDisplaySettings(d.DeviceName, -1, ref cur)) continue;
            int max = 0; int maxW = 0; int maxH = 0;
            for (int m = 0; m < 5000; m++) {
                DEVMODE dm = new DEVMODE();
                dm.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE));
                if (!EnumDisplaySettings(d.DeviceName, m, ref dm)) break;
                if (dm.dmPelsWidth == cur.dmPelsWidth && dm.dmPelsHeight == cur.dmPelsHeight && dm.dmDisplayFrequency > max) max = dm.dmDisplayFrequency;
                if ((long)dm.dmPelsWidth * dm.dmPelsHeight > (long)maxW * maxH) { maxW = dm.dmPelsWidth; maxH = dm.dmPelsHeight; }
            }
            bool principal = (d.StateFlags & 4) != 0;
            res.Add(String.Join("|", new string[] { d.DeviceName, d.DeviceString, cur.dmPelsWidth.ToString(), cur.dmPelsHeight.ToString(), cur.dmDisplayFrequency.ToString(), max.ToString(), maxW.ToString(), maxH.ToString(), principal ? "1" : "0" }));
        }
        return res.ToArray();
    }
}
'@

function Lien-Pcie($pnp) {
    $r = [ordered]@{ largeurActuelle = $null; largeurMax = $null; vitesseActuelle = $null; vitesseMax = $null }
    try {
        $props = @(Get-PnpDeviceProperty -InstanceId $pnp -KeyName 'DEVPKEY_PciDevice_CurrentLinkWidth', 'DEVPKEY_PciDevice_MaxLinkWidth', 'DEVPKEY_PciDevice_CurrentLinkSpeed', 'DEVPKEY_PciDevice_MaxLinkSpeed' -ErrorAction Stop)
        foreach ($p in $props) {
            if ($p.KeyName -eq 'DEVPKEY_PciDevice_CurrentLinkWidth') { $r.largeurActuelle = $p.Data }
            if ($p.KeyName -eq 'DEVPKEY_PciDevice_MaxLinkWidth') { $r.largeurMax = $p.Data }
            if ($p.KeyName -eq 'DEVPKEY_PciDevice_CurrentLinkSpeed') { $r.vitesseActuelle = $p.Data }
            if ($p.KeyName -eq 'DEVPKEY_PciDevice_MaxLinkSpeed') { $r.vitesseMax = $p.Data }
        }
    } catch { }
    return $r
}

function Plus-Grande-Fenetre-Memoire($pnpEntity) {
    # Taille de la plus grande zone memoire de la carte graphique (Go).
    # Plus de 0,5 Go = Re-Size BAR probablement actif.
    try {
        $max = 0
        foreach ($z in @(Get-CimAssociatedInstance -InputObject $pnpEntity -ResultClassName Win32_DeviceMemoryAddress -ErrorAction Stop)) {
            $t = [double]$z.EndingAddress - [double]$z.StartingAddress + 1
            if ($t -gt $max) { $max = $t }
        }
        if ($max -le 0) { return $null }
        return (Arrondi ($max / 1GB) 2)
    } catch { return $null }
}

function M_gpu_ecrans($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $gpus = @()
    foreach ($g in @(Get-CimInstance Win32_VideoController)) {
        $pnpEnt = $null
        if ($g.PNPDeviceID) {
            $idEchappe = $g.PNPDeviceID -replace '\\', '\\'
            $pnpEnt = Get-CimInstance Win32_PnPEntity -Filter "PNPDeviceID='$idEchappe'"
        }
        $gpus += [ordered]@{
            nom         = (Txt $g.Name)
            pilote      = (Txt $g.DriverVersion)
            datePilote  = (D $g.DriverDate)
            statut      = (Txt $g.Status)
            code        = $g.ConfigManagerErrorCode
            pnp         = (Txt $g.PNPDeviceID)
            lien        = $(if ($g.PNPDeviceID -like 'PCI*') { Lien-Pcie $g.PNPDeviceID } else { $null })
            fenetreGo   = $(if ($pnpEnt) { Plus-Grande-Fenetre-Memoire $pnpEnt } else { $null })
        }
    }
    $ecrans = @()
    try {
        if (-not ('DebugFriendEcrans' -as [type])) { Add-Type -TypeDefinition $script:CsEcrans -ErrorAction Stop }
        foreach ($l in @([DebugFriendEcrans]::Liste())) {
            $p = $l -split '\|'
            if ($p.Count -ge 9) {
                $ecrans += [ordered]@{
                    nom = $p[0]; adaptateur = $p[1]; largeur = [int]$p[2]; hauteur = [int]$p[3]
                    hz = [int]$p[4]; hzMax = [int]$p[5]; largeurMax = [int]$p[6]; hauteurMax = [int]$p[7]; principal = ($p[8] -eq '1')
                }
            }
        }
    } catch { Noter-Erreur 'ecrans' $_ }
    $moniteurs = @()
    foreach ($id in @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID)) {
        $nm = -join ($id.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ })
        $mf = -join ($id.ManufacturerName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ })
        $moniteurs += [ordered]@{ nom = (Txt $nm); fabricant = (Txt $mf); interne = ($id.InstanceName -match 'DISPLAY\\(LGD|BOE|AUO|SHP|CMN|SDC|IVO|CSO|NCP|TMA|LEN)') }
    }
    $dpi = (Get-ItemProperty (RegU 'Control Panel\Desktop\WindowMetrics')).AppliedDPI
    $hags = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers').HwSchMode
    $gameMode = (Get-ItemProperty (RegU 'Software\Microsoft\GameBar')).AutoGameModeEnabled
    $dvr1 = (Get-ItemProperty (RegU 'System\GameConfigStore')).GameDVR_Enabled
    $dvrCle = Get-ItemProperty (RegU 'Software\Microsoft\Windows\CurrentVersion\GameDVR')
    $dvr2 = $dvrCle.AppCaptureEnabled
    $dvr3 = $dvrCle.HistoricalCaptureEnabled
    $prefs = @()
    $k = Get-Item (RegU 'Software\Microsoft\DirectX\UserGpuPreferences')
    if ($k) {
        foreach ($v in $k.GetValueNames()) {
            if ($v -and $v -ne 'DirectXUserGlobalSettings') { $prefs += [ordered]@{ appli = (Txt $v 200); reglage = (Txt $k.GetValue($v) 100) } }
        }
    }
    return [ordered]@{
        gpus          = @($gpus)
        ecrans        = @($ecrans)
        moniteurs     = @($moniteurs)
        echelle       = $(if ($dpi) { [math]::Round($dpi * 100 / 96) } else { $null })
        hags          = $hags
        modeJeu       = $gameMode
        gameDvr       = $dvr1
        captureAppli  = $dvr2
        captureArrierePlan = $dvr3
        prefsGpu      = @($prefs)
    }
}

# ---------------------------------------------------------------- batterie
function M_batterie($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $bat = Get-CimInstance Win32_Battery | Select-Object -First 1
    if (-not $bat) { return [ordered]@{ presente = $false } }
    $bst = Get-CimInstance -Namespace root\wmi -ClassName BatteryStatus | Select-Object -First 1
    $design = (Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData | Select-Object -First 1).DesignedCapacity
    $full = (Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity | Select-Object -First 1).FullChargedCapacity
    $cyc = (Get-CimInstance -Namespace root\wmi -ClassName BatteryCycleCount | Select-Object -First 1).CycleCount
    $sante = $null
    if ($design -and $full -and $design -gt 0) { $sante = Arrondi (100 * $full / $design) 0 }
    return [ordered]@{
        presente        = $true
        nom             = (Txt $bat.Name)
        charge          = $bat.EstimatedChargeRemaining
        statutWindows   = $bat.BatteryStatus
        secteur         = $(if ($bst) { [bool]$bst.PowerOnline } else { $null })
        enCharge        = $(if ($bst) { [bool]$bst.Charging } else { $null })
        enDecharge      = $(if ($bst) { [bool]$bst.Discharging } else { $null })
        debitCharge     = $(if ($bst) { $bst.ChargeRate } else { $null })
        debitDecharge   = $(if ($bst) { $bst.DischargeRate } else { $null })
        capaciteOrigine = $design
        capacitePleine  = $full
        sante           = $sante
        cycles          = $cyc
    }
}

# ---------------------------------------------------------------- disques
function M_disques($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $phys = @()
    $sysDisk = $null
    try {
        $partC = Get-Partition -DriveLetter C -ErrorAction Stop
        $sysDisk = $partC.DiskNumber
    } catch { }
    foreach ($d in @(Get-PhysicalDisk)) {
        $rel = $d | Get-StorageReliabilityCounter
        $phys += [ordered]@{
            numero          = [string]$d.DeviceId
            nom             = (Txt $d.FriendlyName)
            type            = [string]$d.MediaType
            bus             = [string]$d.BusType
            sante           = [string]$d.HealthStatus
            etat            = (Txt ($d.OperationalStatus -join ', '))
            go              = (Arrondi ($d.Size / 1GB) 0)
            temperature     = $(if ($rel) { $rel.Temperature } else { $null })
            temperatureMax  = $(if ($rel) { $rel.TemperatureMax } else { $null })
            usure           = $(if ($rel) { $rel.Wear } else { $null })
            erreursLecture  = $(if ($rel) { $rel.ReadErrorsUncorrected } else { $null })
            erreursEcriture = $(if ($rel) { $rel.WriteErrorsUncorrected } else { $null })
            heures          = $(if ($rel) { $rel.PowerOnHours } else { $null })
            systeme         = ($null -ne $sysDisk -and [string]$sysDisk -eq [string]$d.DeviceId)
        }
    }
    $predictions = @()
    foreach ($p in @(Get-CimInstance -Namespace root\wmi -ClassName MSStorageDriver_FailurePredictStatus)) {
        $predictions += [ordered]@{ instance = (Txt $p.InstanceName 200); panneProbable = [bool]$p.PredictFailure; raison = $p.Reason }
    }
    $vols = @()
    foreach ($v in @(Get-Volume | Where-Object { $_.DriveLetter })) {
        $vols += [ordered]@{
            lettre  = [string]$v.DriveLetter
            nom     = (Txt $v.FileSystemLabel)
            fs      = [string]$v.FileSystem
            type    = [string]$v.DriveType
            sante   = [string]$v.HealthStatus
            libreGo = (Arrondi ($v.SizeRemaining / 1GB) 1)
            totalGo = (Arrondi ($v.Size / 1GB) 1)
        }
    }
    $dirty = $null
    $vc = Get-CimInstance Win32_Volume -Filter "DriveLetter='C:'"
    if ($vc -and $null -ne $vc.DirtyBitSet) { $dirty = [bool]$vc.DirtyBitSet }
    $scan = $null
    if ($opt.complete) {
        try { $scan = [string](Repair-Volume -DriveLetter C -Scan -ErrorAction Stop) } catch { Noter-Erreur 'analyse C:' $_ }
    }
    $tmp = @()
    foreach ($p in @($script:Util.temp, (Join-Path $env:SystemRoot 'Temp'), (Join-Path $env:SystemRoot 'SoftwareDistribution\Download'))) {
        $sz = (Get-ChildItem $p -Recurse -Force -File | Measure-Object Length -Sum).Sum
        $tmp += [ordered]@{ dossier = $p; go = (Arrondi ($sz / 1GB) 2) }
    }
    return [ordered]@{
        physiques     = @($phys)
        predictions   = @($predictions)
        volumes       = @($vols)
        marqueurSaleC = $dirty
        analyseC      = $scan
        temporaires   = @($tmp)
    }
}

# ---------------------------------------------------------------- appareils et pilotes
function M_appareils($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $bad = @()
    foreach ($e in @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -ne 0 })) {
        $bad += [ordered]@{
            nom    = (Txt $e.Name)
            classe = (Txt $e.PNPClass)
            code   = $e.ConfigManagerErrorCode
            id     = (Txt $e.PNPDeviceID 200)
            idMat  = (Txt (($e.HardwareID | Select-Object -First 2) -join ' ; ') 200)
        }
    }
    $pilotes = @()
    $classes = @('DISPLAY', 'NET', 'MEDIA', 'BLUETOOTH', 'HDC', 'SCSIADAPTER', 'CAMERA', 'IMAGE', 'SYSTEM', 'USB', 'AUDIOENDPOINT')
    foreach ($s in @(Get-CimInstance Win32_PnPSignedDriver)) {
        if (-not $s.DeviceName) { continue }
        $cl = ([string]$s.DeviceClass).ToUpper()
        if ($classes -notcontains $cl) { continue }
        if ($cl -eq 'SYSTEM' -and $s.DeviceName -notmatch 'chipset|Management Engine|Serial IO|SMBus|PCI Express Root|AMD|Intel\(R\) .*Controller') { continue }
        if ($cl -eq 'USB' -and $s.DeviceName -notmatch 'eXtensible|xHCI|USB4|Thunderbolt') { continue }
        $pilotes += [ordered]@{
            classe      = $cl
            nom         = (Txt $s.DeviceName 120)
            fournisseur = (Txt $s.DriverProviderName 60)
            fabricant   = (Txt $s.Manufacturer 60)
            version     = (Txt $s.DriverVersion 40)
            date        = (D $s.DriverDate)
        }
    }
    $bt = @()
    foreach ($b in @(Get-PnpDevice -Class Bluetooth)) {
        if ($b.FriendlyName -match 'Enumerator|RFCOMM|LE ') { continue }
        $bt += [ordered]@{ nom = (Txt $b.FriendlyName); statut = [string]$b.Status; present = [bool]$b.Present }
    }
    $btService = Get-Service bthserv
    $audio = @()
    foreach ($a in @(Get-PnpDevice -Class AudioEndpoint -PresentOnly)) {
        $audio += [ordered]@{ nom = (Txt $a.FriendlyName); statut = [string]$a.Status }
    }
    $cams = @()
    foreach ($c in @(Get-PnpDevice -Class Camera) + @(Get-PnpDevice -Class Image)) {
        if ($c) { $cams += [ordered]@{ nom = (Txt $c.FriendlyName); statut = [string]$c.Status; present = [bool]$c.Present } }
    }
    $conf = [ordered]@{}
    foreach ($cap in @('webcam', 'microphone')) {
        $u = (Get-ItemProperty ((RegU 'Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\') + $cap)).Value
        $m = (Get-ItemProperty ('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\' + $cap)).Value
        $conf[$cap] = [ordered]@{ utilisateur = $u; machine = $m }
    }
    $imprimantes = @()
    foreach ($p in @(Get-Printer)) {
        $imprimantes += [ordered]@{ nom = (Txt $p.Name); statut = [string]$p.PrinterStatus; pilote = (Txt $p.DriverName); port = (Txt $p.PortName); partagee = [bool]$p.Shared; type = [string]$p.Type }
    }
    $defaut = (Get-CimInstance Win32_Printer | Where-Object { $_.Default } | Select-Object -First 1).Name
    $travaux = 0
    $travauxErreur = 0
    foreach ($p in @(Get-Printer)) {
        foreach ($j in @(Get-PrintJob -PrinterName $p.Name)) {
            $travaux++
            if ([string]$j.JobStatus -match 'Error|Blocked|Offline|PaperOut') { $travauxErreur++ }
        }
    }
    $spool = Get-Service Spooler
    return [ordered]@{
        enErreur          = @($bad)
        pilotes           = @($pilotes)
        bluetooth         = @($bt)
        serviceBluetooth  = $(if ($btService) { [string]$btService.Status } else { $null })
        audio             = @($audio)
        cameras           = @($cams)
        confidentialite   = $conf
        imprimantes       = @($imprimantes)
        imprimanteDefaut  = (Txt $defaut)
        travauxImpression = $travaux
        travauxEnErreur   = $travauxErreur
        spouleur          = $(if ($spool) { [string]$spool.Status } else { $null })
        spouleurDemarrage = $(if ($spool) { [string]$spool.StartType } else { $null })
    }
}

# ---------------------------------------------------------------- evenements (plantages, materiel)
function Compte-Evenements($providers, $extra, $max = 200) {
    $found = @()
    foreach ($p in $providers) {
        $f = @{ LogName = 'System'; ProviderName = $p }
        foreach ($k in $extra.Keys) { $f[$k] = $extra[$k] }
        $found += @(Ev $f $max)
    }
    return @($found | Sort-Object TimeCreated -Descending)
}

function Liste-Ev($evs, $n = 8) {
    $r = @()
    foreach ($e in @($evs | Select-Object -First $n)) {
        $r += [ordered]@{ date = (D $e.TimeCreated); source = [string]$e.ProviderName; id = $e.Id; message = (Txt $e.Message 220) }
    }
    return @($r)
}

function M_evenements($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $j30 = (Get-Date).AddDays(-30)
    $j14 = (Get-Date).AddDays(-14)
    $bsod = Compte-Evenements @('Microsoft-Windows-WER-SystemErrorReporting') @{ Id = 1001; StartTime = $j30 }
    $codes = @()
    foreach ($e in $bsod) {
        $m = [regex]::Match([string]$e.Message, '0x[0-9a-fA-F]{8}')
        if ($m.Success) { $codes += $m.Value.ToLower() }
    }
    $kp41 = Compte-Evenements @('Microsoft-Windows-Kernel-Power') @{ Id = 41; StartTime = $j30 }
    $kp41Codes = @()
    foreach ($e in $kp41) { try { $kp41Codes += [int64]$e.Properties[0].Value } catch { } }
    $e6008 = Compte-Evenements @('EventLog') @{ Id = 6008; StartTime = $j30 }
    $whea = Compte-Evenements @('Microsoft-Windows-WHEA-Logger') @{ StartTime = $j30 }
    $wheaFatal = @($whea | Where-Object { $_.Level -le 2 })
    $gpu = Compte-Evenements @('Display', 'nvlddmkm', 'amdkmdag', 'amdwddmg', 'igfx', 'igfxn') @{ StartTime = $j30; Level = 1, 2, 3 }
    $disque = Compte-Evenements @('disk', 'Ntfs', 'stornvme', 'storahci', 'volmgr') @{ Level = 1, 2, 3; StartTime = $j30 }
    # Erreurs disque : on separe le disque de Windows des autres (cle USB retiree sans
    # l'ejecter, disque externe...). 157 = disque retire a chaud : pas une panne.
    $disque = @($disque | Where-Object { $_.Id -ne 157 })
    $numSys = $null
    try { $numSys = [string](Get-Partition -DriveLetter C -ErrorAction Stop).DiskNumber } catch { }
    $disqueSys = @()
    $disqueAutres = @()
    $numAutres = @()
    foreach ($e in $disque) {
        $mm = [regex]::Match([string]$e.Message, 'Harddisk(\d+)\\DR')
        if ($mm.Success -and $null -ne $numSys -and $mm.Groups[1].Value -ne $numSys) {
            $disqueAutres += $e
            if ($numAutres -notcontains $mm.Groups[1].Value) { $numAutres += $mm.Groups[1].Value }
        } else { $disqueSys += $e }
    }
    $incidents = @($disqueSys | ForEach-Object { $_.TimeCreated.ToString('yyyy-MM-dd HH:mm') } | Select-Object -Unique).Count
    $incidentsAutres = @($disqueAutres | ForEach-Object { $_.TimeCreated.ToString('yyyy-MM-dd HH:mm') } | Select-Object -Unique).Count
    $bride = Compte-Evenements @('Microsoft-Windows-Kernel-Processor-Power') @{ Id = 37; StartTime = $j14 }
    $usb = Compte-Evenements @('Microsoft-Windows-Kernel-PnP') @{ Id = 219; StartTime = $j14 }
    $memoire = @(Ev @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-MemoryDiagnostics-Results' } 5)
    $memRes = $null
    if ($memoire.Count -gt 0) {
        $memRes = [ordered]@{ date = (D $memoire[0].TimeCreated); erreurs = ($memoire[0].Level -le 2); id = $memoire[0].Id; message = (Txt $memoire[0].Message 220) }
    }
    $minidumps = @(Get-ChildItem (Join-Path $env:SystemRoot 'Minidump') -File | Where-Object { $_.LastWriteTime -gt $j30 })
    $watchdog = @(Get-ChildItem (Join-Path $env:SystemRoot 'LiveKernelReports') -Recurse -File -Filter *.dmp | Where-Object { $_.LastWriteTime -gt $j30 })
    $demarrages = @()
    foreach ($e in @(Ev @{ LogName = 'Microsoft-Windows-Diagnostics-Performance/Operational'; Id = 100 } 5)) {
        try {
            $x = [xml]$e.ToXml()
            $bt = ($x.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' }).'#text'
            if ($bt) { $demarrages += [ordered]@{ date = (D $e.TimeCreated); ms = [int64]$bt } }
        } catch { }
    }
    $reveils = @(Ev @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-Power-Troubleshooter'; Id = 1; StartTime = $j14 } 300)
    $wifiCoupures = @(Ev @{ LogName = 'Microsoft-Windows-WLAN-AutoConfig/Operational'; Id = 8003; StartTime = (Get-Date).AddDays(-7) } 500)
    return [ordered]@{
        ecransBleus        = $bsod.Count
        codesEcransBleus   = @($codes)
        ecransBleusListe   = (Liste-Ev $bsod)
        arretsBrutaux      = $kp41.Count
        codesArretsBrutaux = @($kp41Codes)
        arretsBrutauxListe = (Liste-Ev $kp41)
        arretsInattendus   = $e6008.Count
        whea               = $whea.Count
        wheaGraves         = $wheaFatal.Count
        wheaListe          = (Liste-Ev $whea)
        pilotesGraphiques  = $gpu.Count
        gpuListe           = (Liste-Ev $gpu)
        erreursDisque      = $disqueSys.Count
        disqueIncidents    = $incidents
        disqueListe        = (Liste-Ev $disqueSys)
        disqueSysteme      = $numSys
        erreursAutresDisques = $disqueAutres.Count
        autresDisquesIncidents = $incidentsAutres
        autresDisquesNumeros = @($numAutres)
        autresDisquesListe = (Liste-Ev $disqueAutres 4)
        bridageCpu14j      = $bride.Count
        usbProblemes14j    = $usb.Count
        testMemoire        = $memRes
        minidumps30j       = $minidumps.Count
        rapportsNoyau30j   = $watchdog.Count
        demarrages         = @($demarrages)
        reveils14j         = $reveils.Count
        coupuresWifi7j     = $wifiCoupures.Count
    }
}

# ---------------------------------------------------------------- applications qui plantent, fiabilite
function M_applis($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $j30 = (Get-Date).AddDays(-30)
    $j14 = (Get-Date).AddDays(-14)
    $res = [ordered]@{ plantages = @(); blocages = @(); stabilite = $null; erreursSysteme = @() }
    $ae = @(Ev @{ LogName = 'Application'; ProviderName = 'Application Error'; Id = 1000; StartTime = $j30 } 1000)
    $res.plantages = @($ae | Group-Object { [string]$_.Properties[0].Value } | Sort-Object Count -Descending | Select-Object -First 12 | ForEach-Object { [ordered]@{ appli = (Txt $_.Name 80); nombre = $_.Count; dernier = (D ($_.Group | Select-Object -First 1).TimeCreated) } })
    $ah = @(Ev @{ LogName = 'Application'; ProviderName = 'Application Hang'; Id = 1002; StartTime = $j30 } 1000)
    $res.blocages = @($ah | Group-Object { [string]$_.Properties[0].Value } | Sort-Object Count -Descending | Select-Object -First 12 | ForEach-Object { [ordered]@{ appli = (Txt $_.Name 80); nombre = $_.Count; dernier = (D ($_.Group | Select-Object -First 1).TimeCreated) } })
    $st = Get-CimInstance Win32_ReliabilityStabilityMetrics | Sort-Object TimeGenerated -Descending | Select-Object -First 1
    if ($st) { $res.stabilite = Arrondi $st.SystemStabilityIndex 2 }
    $se = @(Ev @{ LogName = 'System'; Level = 1, 2; StartTime = $j14 } 3000)
    $res.erreursSysteme = @($se | Group-Object ProviderName, Id | Sort-Object Count -Descending | Select-Object -First 15 | ForEach-Object { [ordered]@{ source = (Txt $_.Name 100); nombre = $_.Count; exemple = (Txt (($_.Group | Select-Object -First 1).Message) 200) } })
    return $res
}

# ---------------------------------------------------------------- Windows Update
function M_maj($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $pend = @()
    if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') { $pend += 'composants' }
    if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { $pend += 'windowsupdate' }
    if ((Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager').PendingFileRenameOperations) { $pend += 'fichiers' }
    $echecs = @()
    $dernieres = @()
    $derniereCumulative = $null
    $derniereReussie = $null
    try {
        $us = New-Object -ComObject Microsoft.Update.Session
        $srch = $us.CreateUpdateSearcher()
        $n = $srch.GetTotalHistoryCount()
        if ($n -gt 0) {
            $tout = @($srch.QueryHistory(0, [Math]::Min(300, $n)) | Where-Object { $_.Title })
            foreach ($u in $tout) {
                if ($u.ResultCode -eq 4 -and $u.Date -gt (Get-Date).AddDays(-60) -and $echecs.Count -lt 10) {
                    $echecs += [ordered]@{ date = (D $u.Date); titre = (Txt $u.Title 160); code = ('0x{0:X8}' -f $u.HResult) }
                }
                if ($u.ResultCode -eq 2 -and $u.Title -notmatch '2267602|Defender|Antivirus|antivirus') {
                    if ($null -eq $derniereReussie -or $u.Date -gt $derniereReussie) { $derniereReussie = $u.Date }
                    if ($u.Title -match 'umulati|cumulative|KB50|KB51|KB52|KB53' -and $u.Title -match 'Windows') {
                        if ($null -eq $derniereCumulative -or $u.Date -gt $derniereCumulative) { $derniereCumulative = $u.Date }
                    }
                }
            }
            foreach ($u in @($tout | Where-Object { $_.Title -notmatch '2267602' } | Select-Object -First 12)) {
                $dernieres += [ordered]@{ date = (D $u.Date); titre = (Txt $u.Title 160); resultat = $u.ResultCode }
            }
        }
    } catch { Noter-Erreur 'historique des mises a jour' $_ }
    $dispo = $null
    $recherche = 'non faite'
    if ($opt.complete) {
        $job = Start-Job -ScriptBlock {
            $s = (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher()
            $r = $s.Search("IsInstalled=0 and IsHidden=0")
            foreach ($u in $r.Updates) { $u.Title }
        }
        if (Wait-Job $job -Timeout 240) {
            $jerr = $null
            $titres = @(Receive-Job $job -ErrorVariable jerr)
            if ($jerr) { $recherche = 'erreur'; Noter-Erreur 'recherche de mises a jour' ($jerr | Select-Object -First 1) }
            else { $recherche = 'ok'; $dispo = @($titres | Select-Object -First 30 | ForEach-Object { Txt $_ 160 }) }
        } else { $recherche = 'trop longue'; Stop-Job $job }
        Remove-Job $job -Force
    }
    $svc = Get-Service wuauserv
    $svcCim = Get-CimInstance Win32_Service -Filter "Name='wuauserv'"
    return [ordered]@{
        redemarrageAttente = @($pend)
        echecs             = @($echecs)
        dernieres          = @($dernieres)
        derniereCumulative = (D $derniereCumulative)
        derniereReussie    = (D $derniereReussie)
        disponibles        = $(if ($null -ne $dispo) { @($dispo) } else { $null })
        recherche          = $recherche
        serviceEtat        = $(if ($svc) { [string]$svc.Status } else { $null })
        serviceDemarrage   = $(if ($svcCim) { [string]$svcCim.StartMode } else { $null })
    }
}

# ---------------------------------------------------------------- securite
function M_securite($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $mp = $null
    try { $mp = Get-MpComputerStatus -ErrorAction Stop } catch { }
    $av = @()
    foreach ($a in @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct)) {
        $hex = '{0:X6}' -f [int]$a.productState
        $av += [ordered]@{ nom = (Txt $a.displayName); etat = [int]$a.productState; actif = (@('10', '11') -contains $hex.Substring(2, 2)); aJour = ($hex.Substring(4, 2) -eq '00') }
    }
    $menaces = @()
    foreach ($t in @(Get-MpThreat)) {
        $menaces += [ordered]@{ nom = (Txt $t.ThreatName); gravite = $t.SeverityID; active = [bool]$t.IsActive; executee = [bool]$t.DidThreatExecute }
    }
    $pf = @()
    foreach ($p in @(Get-NetFirewallProfile)) { $pf += [ordered]@{ profil = [string]$p.Name; actif = ([string]$p.Enabled -eq 'True') } }
    $sb = $null
    try { $sb = [string](Confirm-SecureBootUEFI -ErrorAction Stop) } catch { $sb = 'bios' }
    $tpm = [ordered]@{ present = $null; pret = $null; version = $null }
    try { $t = Get-Tpm -ErrorAction Stop; $tpm.present = [bool]$t.TpmPresent; $tpm.pret = [bool]$t.TpmReady } catch { }
    $wt = Get-CimInstance -Namespace root\cimv2\security\microsofttpm -ClassName Win32_Tpm
    if ($wt -and $wt.SpecVersion) { $tpm.version = ([string]$wt.SpecVersion).Split(',')[0].Trim() }
    $dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard
    $bl = $null
    if (Get-Command Get-BitLockerVolume) {
        $b = Get-BitLockerVolume -MountPoint 'C:'
        if ($b) {
            $bl = [ordered]@{
                etat        = [string]$b.VolumeStatus
                protection  = [string]$b.ProtectionStatus
                pourcentage = $b.EncryptionPercentage
                methode     = [string]$b.EncryptionMethod
                protecteurs = @($b.KeyProtector | ForEach-Object { [string]$_.KeyProtectorType })
            }
        }
    }
    $uac = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System').EnableLUA
    $is = Get-ItemProperty (RegU 'Software\Microsoft\Windows\CurrentVersion\Internet Settings')
    $hosts = @()
    $hp = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    foreach ($l in @(Get-Content $hp)) {
        $t = ([string]$l).Trim()
        if ($t -and -not $t.StartsWith('#')) { $hosts += (Txt $t 120) }
    }
    $taches = @()
    foreach ($t in @(Get-ScheduledTask)) {
        foreach ($a in @($t.Actions)) {
            $cmd = ([string]$a.Execute + ' ' + [string]$a.Arguments)
            $suspect = $false
            if ($cmd -match '(?i)powershell.*\s-(e|ec|enc|encodedcommand)\s') { $suspect = $true }
            if ($cmd -match '(?i)mshta(\.exe)?\s|\\(wscript|cscript)(\.exe)?.*\\(AppData|Temp)\\') { $suspect = $true }
            if ($cmd -match '(?i)\\AppData\\Local\\Temp\\|\\Windows\\Temp\\.*\.exe') { $suspect = $true }
            if ($suspect) { $taches += [ordered]@{ nom = (Txt $t.TaskName 100); chemin = (Txt $t.TaskPath 100); commande = (Txt $cmd 200); etat = [string]$t.State } }
        }
    }
    return [ordered]@{
        defender = $(if ($mp) { [ordered]@{
                service       = [bool]$mp.AMServiceEnabled
                antivirus     = [bool]$mp.AntivirusEnabled
                tempsReel     = [bool]$mp.RealTimeProtectionEnabled
                mode          = (Txt $mp.AMRunningMode)
                signatures    = (D $mp.AntivirusSignatureLastUpdated)
                ageSignatures = $mp.AntivirusSignatureAge
                ageRapide     = $mp.QuickScanAge
                ageComplete   = $mp.FullScanAge
                antiFalsif    = $mp.IsTamperProtected
            } } else { $null })
        antivirus      = @($av)
        menaces        = @($menaces)
        parefeu        = @($pf)
        secureBoot     = $sb
        tpm            = $tpm
        vbs            = $(if ($dg) { $dg.VirtualizationBasedSecurityStatus } else { $null })
        integriteMem   = $(if ($dg) { (@($dg.SecurityServicesRunning) -contains 2) } else { $null })
        bitlocker      = $bl
        uac            = $uac
        proxyActif     = ($is.ProxyEnable -eq 1)
        proxyServeur   = (Txt $is.ProxyServer)
        proxyScript    = (Txt $is.AutoConfigURL)
        hosts          = @($hosts | Select-Object -First 30)
        hostsNombre    = $hosts.Count
        tachesSuspectes = @($taches | Select-Object -First 15)
    }
}

# ---------------------------------------------------------------- demarrage et alimentation
function Get-PowerIdx($sub, $setting) {
    $o = (powercfg /qh SCHEME_CURRENT $sub $setting | Out-String)
    $m = [regex]::Matches($o, '0x[0-9a-fA-F]{8}')
    if ($m.Count -ge 2) { return @([Convert]::ToInt64($m[$m.Count - 2].Value, 16), [Convert]::ToInt64($m[$m.Count - 1].Value, 16)) }
    return $null
}

function M_demarrage($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $appr = @{}
    foreach ($k in @((RegU 'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'), 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32', (RegU 'Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder'), 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder')) {
        $it = Get-Item $k
        if ($it) {
            foreach ($v in $it.GetValueNames()) {
                $b = $it.GetValue($v)
                if ($b -is [byte[]] -and $b.Length -gt 0) { $appr[$v] = (($b[0] -band 1) -eq 0) }
            }
        }
    }
    $progs = @()
    foreach ($s in @(Get-CimInstance Win32_StartupCommand | Where-Object { $_.Location -notmatch '^HKU\\(S-1-5-(18|19|20)|\.DEFAULT)\\' })) {
        $actif = $true
        if ($appr.ContainsKey($s.Name)) { $actif = $appr[$s.Name] } elseif ($appr.ContainsKey($s.Name + '.lnk')) { $actif = $appr[$s.Name + '.lnk'] }
        $progs += [ordered]@{ nom = (Txt $s.Name 80); actif = $actif; commande = (Txt $s.Command 200) }
    }
    $schema = (Run-Utf8 { powercfg /getactivescheme } | Out-String).Trim()
    $guid = $null
    $nomSchema = $null
    $m = [regex]::Match($schema, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*\((.+)\)')
    if ($m.Success) { $guid = $m.Groups[1].Value.ToLower(); $nomSchema = $m.Groups[2].Value }
    $ps = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes'
    $veille = Get-PowerIdx SUB_SLEEP STANDBYIDLE
    $capot = Get-PowerIdx SUB_BUTTONS LIDACTION
    $ecran = Get-PowerIdx SUB_VIDEO VIDEOIDLE
    return [ordered]@{
        programmes      = @($progs)
        actifs          = @($progs | Where-Object { $_.actif }).Count
        schemaGuid      = $guid
        schemaNom       = (Txt $nomSchema)
        modeSecteur     = (Txt ([string]$ps.ActiveOverlayAcPowerScheme))
        modeBatterie    = (Txt ([string]$ps.ActiveOverlayDcPowerScheme))
        veilleSecteur   = $(if ($veille) { $veille[0] } else { $null })
        veilleBatterie  = $(if ($veille) { $veille[1] } else { $null })
        capotSecteur    = $(if ($capot) { $capot[0] } else { $null })
        capotBatterie   = $(if ($capot) { $capot[1] } else { $null })
        ecranSecteur    = $(if ($ecran) { $ecran[0] } else { $null })
        ecranBatterie   = $(if ($ecran) { $ecran[1] } else { $null })
    }
}

# ---------------------------------------------------------------- reseau
function Lire-Wifi {
    $lignes = Run-Utf8 { netsh wlan show interfaces }
    $w = [ordered]@{ present = $false; connecte = $false; ssid = $null; signal = $null; canal = $null; bande = $null; radio = $null; reception = $null; emission = $null; carte = $null }
    foreach ($l in @($lignes)) {
        $i = ([string]$l).IndexOf(':')
        if ($i -lt 1) { continue }
        $cle = ([string]$l).Substring(0, $i).Trim().ToLower()
        $val = ([string]$l).Substring($i + 1).Trim()
        if ($cle -match '^(nom|name)$') { $w.present = $true }
        if ($cle -match '^description$') { $w.carte = (Txt $val); $w.present = $true }
        if ($cle -match '^(.tat|state)$') { $w.connecte = ($val -match '^(connect|connecte|connected)') -and ($val -notmatch 'd.connect|disconnect') }
        if ($cle -eq 'ssid') { $w.ssid = (Txt $val) }
        if ($cle -match '^signal$') { $w.signal = [int]($val -replace '[^0-9]', '') }
        if ($cle -match '^(canal|channel)$') { $w.canal = [int]($val -replace '[^0-9]', '') }
        if ($cle -match '^(bande|band)$') { $w.bande = (Txt $val) }
        if ($cle -match '^(type de radio|radio type)$') { $w.radio = (Txt $val) }
        if ($cle -match '^(r.ception|receive rate)') { $w.reception = (Txt $val) }
        if ($cle -match '^(transmission|transmit rate)') { $w.emission = (Txt $val) }
    }
    return $w
}

function Test-Internet {
    try {
        $req = [System.Net.WebRequest]::Create('http://www.msftconnecttest.com/connecttest.txt')
        $req.Timeout = 5000
        $resp = $req.GetResponse()
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $t = $sr.ReadToEnd()
        $resp.Close()
        return ($t -match 'Microsoft Connect Test')
    } catch { return $false }
}

function M_reseau($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $cartes = @()
    foreach ($a in @(Get-NetAdapter)) {
        $eco = $null
        if ($a.PnPDeviceID) {
            $pm = Get-CimInstance -Namespace root\wmi -ClassName MSPower_DeviceEnable | Where-Object { $_.InstanceName -like ($a.PnPDeviceID + '*') } | Select-Object -First 1
            if ($pm) { $eco = [bool]$pm.Enable }
        }
        $cartes += [ordered]@{
            nom         = (Txt $a.Name)
            description = (Txt $a.InterfaceDescription)
            statut      = [string]$a.Status
            vitesse     = (Txt $a.LinkSpeed)
            physique    = [bool]$a.HardwareInterface
            wifi        = ($a.PhysicalMediaType -match '802\.11' -or $a.InterfaceDescription -match 'Wi-Fi|Wireless|WLAN|802\.11')
            pilote      = (Txt $a.DriverVersion)
            datePilote  = (D $a.DriverDate)
            economie    = $eco
        }
    }
    $dns = @()
    foreach ($d in @(Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses })) {
        $dns += [ordered]@{ carte = (Txt $d.InterfaceAlias); serveurs = @($d.ServerAddresses) }
    }
    return [ordered]@{
        cartes   = @($cartes)
        wifi     = (Lire-Wifi)
        dns      = @($dns)
        internet = (Test-Internet)
    }
}

# ---------------------------------------------------------------- logiciels installes
function M_logiciels($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $uk = @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', (RegU 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'))
    $vus = @{}
    $apps = @()
    foreach ($p in @(Get-ItemProperty $uk | Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 -and -not $_.ParentKeyName })) {
        $n = Txt $p.DisplayName 100
        if ($vus.ContainsKey($n)) { continue }
        $vus[$n] = $true
        $apps += [ordered]@{ nom = $n; version = (Txt $p.DisplayVersion 40); editeur = (Txt $p.Publisher 60); date = (Txt $p.InstallDate 10) }
    }
    $store = @()
    foreach ($a in @(Get-AppxPackage -AllUsers | Where-Object { $_.Name -match 'Lenovo|LenovoCompanion|HP|Hewlett|Dell|ASUS|Armoury|Acer|MSI|Gigabyte|AORUS|NVIDIA|AMD|Intel|Realtek|Legion|OMEN|Alienware|Razer|Samsung' } | Select-Object Name, Version -Unique)) {
        $store += [ordered]@{ nom = (Txt $a.Name 100); version = (Txt $a.Version 40) }
    }
    $ext = @()
    $racines = @(
        @{ nav = 'Chrome'; dossier = (Join-Path $script:Util.local 'Google\Chrome\User Data') },
        @{ nav = 'Edge'; dossier = (Join-Path $script:Util.local 'Microsoft\Edge\User Data') },
        @{ nav = 'Brave'; dossier = (Join-Path $script:Util.local 'BraveSoftware\Brave-Browser\User Data') }
    )
    foreach ($r in $racines) {
        if (-not (Test-Path $r.dossier)) { continue }
        foreach ($prof in @(Get-ChildItem $r.dossier -Directory | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })) {
            $edir = Join-Path $prof.FullName 'Extensions'
            foreach ($e in @(Get-ChildItem $edir -Directory)) {
                $ver = Get-ChildItem $e.FullName -Directory | Sort-Object Name -Descending | Select-Object -First 1
                if (-not $ver) { continue }
                $man = $null
                try { $man = Get-Content (Join-Path $ver.FullName 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json } catch { }
                if (-not $man) { continue }
                $nom = [string]$man.name
                if ($nom -match '^__MSG_(.+)__$') {
                    $cle = $Matches[1]
                    foreach ($lg in @('fr', [string]$man.default_locale, 'en', 'en_US')) {
                        if (-not $lg) { continue }
                        $mf = Join-Path $ver.FullName ('_locales\' + $lg + '\messages.json')
                        if (Test-Path $mf) {
                            try {
                                $msgs = Get-Content $mf -Raw -Encoding UTF8 | ConvertFrom-Json
                                foreach ($pr in $msgs.PSObject.Properties) { if ($pr.Name -ieq $cle) { $nom = [string]$pr.Value.message } }
                            } catch { }
                            if ($nom -notmatch '^__MSG_') { break }
                        }
                    }
                }
                if ($nom -match '^__MSG_') { continue }
                $ext += [ordered]@{ navigateur = $r.nav; profil = $prof.Name; nom = (Txt $nom 80); id = $e.Name }
            }
        }
    }
    return [ordered]@{
        programmes = @($apps | Sort-Object { $_.nom })
        nombre     = $apps.Count
        store      = @($store)
        extensions = @($ext)
    }
}

# ---------------------------------------------------------------- fichiers de Windows (analyse complete)
function M_fichiers_windows($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $dism = $null
    try { $dism = [string](Repair-WindowsImage -Online -CheckHealth -ErrorAction Stop).ImageHealthState } catch { Noter-Erreur 'DISM' $_ }
    $sfcEtat = 'inconnu'
    $sfcTexte = $null
    $prevEnc = [Console]::OutputEncoding
    try {
        [Console]::OutputEncoding = [System.Text.Encoding]::Unicode
        $sfc = (sfc /verifyonly | Out-String)
    } finally { [Console]::OutputEncoding = $prevEnc }
    $sfc = $sfc -replace "`0", ''
    $sfcTexte = Txt ((($sfc -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -Last 3) -join ' ') 400
    if ($sfc -match 'did not find any integrity violations|n.a trouv. aucune violation') { $sfcEtat = 'ok' }
    elseif ($sfc -match 'found integrity violations|a trouv. des violations|des violations d.int.grit') { $sfcEtat = 'violations' }
    elseif ($sfc -match 'could not perform|n.a pas pu effectuer|pending|en attente') { $sfcEtat = 'impossible' }
    return [ordered]@{ dism = $dism; sfc = $sfcEtat; sfcTexte = $sfcTexte }
}

# ---------------------------------------------------------------- temperatures (repos et test de chauffe)
$script:LHM = $null

function Ouvrir-LHM {
    if ($script:LHM) { return $true }
    $dll = Join-Path (Split-Path $PSScriptRoot -Parent) 'outils\LibreHardwareMonitor\LibreHardwareMonitorLib.dll'
    if (-not (Test-Path $dll)) { return $false }
    try {
        Add-Type -Path $dll -ErrorAction Stop
        $c = New-Object LibreHardwareMonitor.Hardware.Computer
        $c.IsCpuEnabled = $true
        $c.IsGpuEnabled = $true
        $c.IsMotherboardEnabled = $true
        $c.Open()
        $script:LHM = $c
        return $true
    } catch { Noter-Erreur 'LibreHardwareMonitor' $_; return $false }
}

function Fermer-LHM {
    if ($script:LHM) { try { $script:LHM.Close() } catch { }; $script:LHM = $null }
}

function M_temperatures($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $r = [ordered]@{ cpu = $null; gpu = $null; sources = @(); capteurs = @(); ventilateurs = @(); perfCpu = $null; chargeCpu = $null; frequence = $null; lhm = $false; lhmPresent = $false }
    $r.lhmPresent = Test-Path (Join-Path (Split-Path $PSScriptRoot -Parent) 'outils\LibreHardwareMonitor\LibreHardwareMonitorLib.dll')
    $pi = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'"
    if ($pi) { $r.perfCpu = $pi.PercentProcessorPerformance; $r.chargeCpu = $pi.PercentProcessorUtility; $r.frequence = $pi.ProcessorFrequency }
    if ($null -eq $r.chargeCpu) { $r.chargeCpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).LoadPercentage }
    if ($opt.lhm -and (Ouvrir-LHM)) {
        $r.lhm = $true
        $r.sources += 'LibreHardwareMonitor'
        $cpuT = @()
        $gpuT = @()
        foreach ($hw in @($script:LHM.Hardware)) {
            $hw.Update()
            $tous = @($hw)
            foreach ($sub in @($hw.SubHardware)) { $sub.Update(); $tous += $sub }
            foreach ($h in $tous) {
                foreach ($s in @($h.Sensors)) {
                    if ($null -eq $s.Value) { continue }
                    $type = [string]$s.SensorType
                    $ht = [string]$h.HardwareType
                    if ($type -eq 'Temperature') {
                        $r.capteurs += [ordered]@{ materiel = (Txt $h.Name 60); capteur = (Txt $s.Name 60); valeur = (Arrondi $s.Value 1) }
                        if ($ht -eq 'Cpu' -and $s.Name -match 'Package|Tctl|Tdie|Core Max|Core \(Tctl') { $cpuT += [double]$s.Value }
                        if ($ht -like 'Gpu*' -and $s.Name -match '^GPU Core$|^GPU Temperature$|^Core$') { $gpuT += [double]$s.Value }
                    }
                    if ($type -eq 'Fan') { $r.ventilateurs += [ordered]@{ materiel = (Txt $h.Name 60); capteur = (Txt $s.Name 60); tours = (Arrondi $s.Value 0) } }
                }
            }
        }
        if ($cpuT.Count -gt 0) { $r.cpu = Arrondi (($cpuT | Measure-Object -Maximum).Maximum) 1 }
        if ($gpuT.Count -gt 0) { $r.gpu = Arrondi (($gpuT | Measure-Object -Maximum).Maximum) 1 }
    }
    if ($null -eq $r.cpu) {
        $z = @(Get-CimInstance -Namespace root\wmi -ClassName MSAcpi_ThermalZoneTemperature)
        $vals = @()
        foreach ($t in $z) { if ($t.CurrentTemperature -gt 2732) { $vals += ($t.CurrentTemperature / 10 - 273.15) } }
        if ($vals.Count -eq 0) {
            foreach ($t in @(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation)) {
                if ($t.Temperature -gt 273) { $vals += ($t.Temperature - 273.15) }
            }
        }
        if ($vals.Count -gt 0) { $r.cpu = Arrondi (($vals | Measure-Object -Maximum).Maximum) 1; $r.sources += 'zone thermique ACPI (approximatif)' }
    }
    if ($null -eq $r.gpu) {
        $smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
        if (-not $smi) { $p = Join-Path $env:ProgramFiles 'NVIDIA Corporation\NVSMI\nvidia-smi.exe'; if (Test-Path $p) { $smi = $p } }
        if ($smi) {
            $o = & $smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>$null
            $v = [string]($o | Select-Object -First 1)
            if ($v -match '^\s*(\d+)') { $r.gpu = [double]$Matches[1]; $r.sources += 'nvidia-smi' }
        }
    }
    return $r
}

# ---------------------------------------------------------------- appareils USB (test des ports)
function M_usb($opt) {
    $ErrorActionPreference = 'SilentlyContinue'
    $l = @()
    foreach ($e in @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPDeviceID -like 'USB\*' -or $_.PNPDeviceID -like 'USBSTOR\*' })) {
        if ($e.PNPDeviceID -match 'ROOT_HUB|USB\\VID_[0-9A-F]{4}&PID_[0-9A-F]{4}&MI_') { continue }
        $l += [ordered]@{ id = (Txt $e.PNPDeviceID 200); nom = (Txt $e.Name 100); classe = (Txt $e.PNPClass 40) }
    }
    return [ordered]@{ appareils = @($l) }
}

# ---------------------------------------------------------------- aiguillage
$script:ListeModules = @('systeme', 'cpu_ram', 'gpu_ecrans', 'batterie', 'disques', 'appareils', 'evenements', 'applis', 'maj', 'securite', 'demarrage', 'reseau', 'logiciels', 'fichiers_windows', 'temperatures', 'usb')

function Collecter($nom, $opt) {
    $script:ErreursModule = New-Object System.Collections.ArrayList
    if ($script:ListeModules -notcontains $nom) { throw ('Module inconnu : ' + $nom) }
    if ($null -eq $opt) { $opt = [pscustomobject]@{ complete = $false; lhm = $false } }
    $debut = Get-Date
    $donnees = $null
    try {
        $donnees = & ('M_' + $nom) $opt
    } catch {
        Noter-Erreur $nom $_
    }
    return [ordered]@{
        module  = $nom
        donnees = $donnees
        erreurs = @($script:ErreursModule)
        duree   = [math]::Round(((Get-Date) - $debut).TotalSeconds, 1)
    }
}
