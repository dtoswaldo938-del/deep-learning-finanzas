param(
    [ValidateSet("iniciar", "detener")]
    [string]$Accion = "iniciar"
)

$ErrorActionPreference = "Stop"

$raiz = $PSScriptRoot
$estadoArchivo = Join-Path $raiz ".neural_finance_procesos.json"

$servicios = @(
    @{
        Nombre = "Backend"
        Puerto = 8001
        Ruta = "/docs"
        Ejecutable = (Join-Path $raiz "06_BACKEND\.venv313\Scripts\python.exe")
        Argumentos = "-m uvicorn app.main:app --host 127.0.0.1 --port 8001"
        Directorio = (Join-Path $raiz "06_BACKEND")
        Identificador = "uvicorn app.main:app"
    },
    @{
        Nombre = "Frontend"
        Puerto = 5174
        Ruta = "/"
        Ejecutable = "node.exe"
        Argumentos = "--host 127.0.0.1 --port 5174 --strictPort"
        Directorio = (Join-Path $raiz "07_FRONTEND")
        Identificador = "vite"
    },
    @{
        Nombre = "Ollama"
        Puerto = 11434
        Ruta = "/api/tags"
        Ejecutable = (Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe")
        Argumentos = "serve"
        Directorio = $raiz
        Identificador = "ollama.exe"
    }
)

function Obtener-ProcesoPuerto($puerto) {
    $conexion = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($conexion) {
        return Get-CimInstance Win32_Process -Filter "ProcessId = $($conexion.OwningProcess)"
    }

    return $null
}

function Comprobar-Servicio($servicio) {
    try {
        $url = "http://127.0.0.1:$($servicio.Puerto)$($servicio.Ruta)"
        $respuesta = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
        return ($respuesta.StatusCode -eq 200)
    }
    catch {
        return $false
    }
}

if ($Accion -eq "detener") {

    Write-Host "Deteniendo procesos registrados..." -ForegroundColor Cyan

    if (-not (Test-Path $estadoArchivo)) {
        Write-Host "No hay procesos registrados por el lanzador." -ForegroundColor Yellow
        exit 0
    }

    $registros = @(Get-Content $estadoArchivo -Raw | ConvertFrom-Json)
    $pendientes = @()

    foreach ($registro in $registros) {

        $proceso = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $($registro.PID)" `
            -ErrorAction SilentlyContinue

        if (-not $proceso) {
            Write-Host "$($registro.Servicio): proceso ya finalizado."
            continue
        }

        $identidadCorrecta = (
            $proceso.Name -eq $registro.NombreProceso -and
            $proceso.CommandLine -eq $registro.Comando -and
            $registro.FechaCreacion -and
            "$($proceso.CreationDate)" -eq "$($registro.FechaCreacion)"
        )

        if (-not $identidadCorrecta) {
            Write-Host "$($registro.Servicio): identidad no verificada. No se detiene." -ForegroundColor Yellow
            $pendientes += $registro
            continue
        }

        $hijos = @(
            Get-CimInstance Win32_Process `
                -Filter "ParentProcessId = $($proceso.ProcessId)" `
                -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.Name -eq $proceso.Name -and
                    $_.CommandLine -eq $proceso.CommandLine -and
                    $_.CreationDate -ge $proceso.CreationDate
                }
        )

        foreach ($hijo in $hijos) {
            try {
                Stop-Process -Id $hijo.ProcessId -Force -ErrorAction Stop
                Write-Host "Proceso hijo $($hijo.ProcessId) detenido." -ForegroundColor Green
            }
            catch {
                Write-Host "No se pudo detener el hijo $($hijo.ProcessId)." -ForegroundColor Yellow
            }
        }

        try {
            Stop-Process -Id $proceso.ProcessId -Force -ErrorAction Stop
            Write-Host "$($registro.Servicio) detenido." -ForegroundColor Green
        }
        catch {
            Write-Host "No se pudo detener $($registro.Servicio)." -ForegroundColor Yellow
            $pendientes += $registro
        }
    }

    if ($pendientes.Count -gt 0) {
        ConvertTo-Json -InputObject @($pendientes) -Depth 5 |
            Set-Content $estadoArchivo -Encoding UTF8
    }
    else {
        Remove-Item $estadoArchivo -Force
    }

    Write-Host "Apagado finalizado." -ForegroundColor Green
    exit 0
}
Write-Host "Iniciando Neural Finance..." -ForegroundColor Cyan

$registros = @()

if (Test-Path $estadoArchivo) {
    $registros = @(Get-Content $estadoArchivo -Raw | ConvertFrom-Json)
}

foreach ($servicio in $servicios) {

    $procesoExistente = Obtener-ProcesoPuerto $servicio.Puerto

    if ($procesoExistente) {
        if (-not (Comprobar-Servicio $servicio)) {
            throw "El puerto $($servicio.Puerto) esta ocupado, pero el servicio no responde correctamente."
        }

        Write-Host "$($servicio.Nombre) ya esta funcionando." -ForegroundColor Green
        continue
    }

    if ($servicio.Nombre -eq "Frontend") {
        $vite = Join-Path $servicio.Directorio "node_modules\vite\bin\vite.js"

        if (-not (Test-Path $vite)) {
            throw "No se encontro Vite. Revisa node_modules."
        }

        $ejecutable = (Get-Command node.exe -ErrorAction Stop).Source
        $argumentos = "`"$vite`" $($servicio.Argumentos)"
    }
    else {
        $ejecutable = $servicio.Ejecutable
        $argumentos = $servicio.Argumentos
    }

    if (-not (Test-Path $ejecutable)) {
        throw "No se encontro el ejecutable: $ejecutable"
    }

    if ($servicio.Nombre -eq "Backend") {

        $logSalida = Join-Path $raiz "neural_backend_launcher_stdout.log"
        $logError = Join-Path $raiz "neural_backend_launcher_stderr.log"

        $nuevo = Start-Process `
            -FilePath $ejecutable `
            -ArgumentList $argumentos `
            -WorkingDirectory $servicio.Directorio `
            -RedirectStandardOutput $logSalida `
            -RedirectStandardError $logError `
            -PassThru
    }
    else {
        $nuevo = Start-Process `
            -FilePath $ejecutable `
            -ArgumentList $argumentos `
            -WorkingDirectory $servicio.Directorio `
            -PassThru
    }

    $detalle = Get-CimInstance Win32_Process -Filter "ProcessId = $($nuevo.Id)"

    $registros += [PSCustomObject]@{
        Servicio = $servicio.Nombre
        PID = $nuevo.Id
        NombreProceso = $detalle.Name
        Comando = $detalle.CommandLine
        FechaCreacion = "$($detalle.CreationDate)"
    }

    $registros | ConvertTo-Json -Depth 5 |
        Set-Content $estadoArchivo -Encoding UTF8

    $listo = $false

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1

        if (Comprobar-Servicio $servicio) {
            $listo = $true
            break
        }
    }

    if (-not $listo) {
        throw "$($servicio.Nombre) no inicio correctamente."
    }

    Write-Host "$($servicio.Nombre) iniciado." -ForegroundColor Green
}

Write-Host "`nNeural Finance listo." -ForegroundColor Green
Start-Process "http://127.0.0.1:5174/"