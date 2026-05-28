# ============================================
#  BLACK INK STUDIO — Icone de bandeja (system tray)
#  Inicia o servidor Node em segundo plano e oferece
#  atalhos para abrir as paginas no navegador.
# ============================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Port = 3000
$BaseUrl = "http://localhost:$Port"

# --- localizar node ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    [System.Windows.Forms.MessageBox]::Show(
        "Node.js nao encontrado no PATH. Instale o Node.js para rodar o servidor.",
        "Black Ink Studio", 'OK', 'Error') | Out-Null
    return
}

# --- verificar se a porta ja esta em uso ---
function Test-PortBusy {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $Port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

# --- iniciar servidor (so se nao estiver rodando) ---
$script:serverProc = $null
if (-not (Test-PortBusy)) {
    $script:serverProc = Start-Process -FilePath $nodeCmd.Source -ArgumentList "server.js" `
        -WorkingDirectory $ProjectDir -WindowStyle Hidden -PassThru
}

# --- desenhar icone (marca vermelha em fundo escuro) ---
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(10, 10, 10))
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 16, 46))
$pts = @(
    [System.Drawing.Point]::new(16, 2),
    [System.Drawing.Point]::new(27, 13),
    [System.Drawing.Point]::new(21, 19),
    [System.Drawing.Point]::new(24, 30),
    [System.Drawing.Point]::new(16, 23),
    [System.Drawing.Point]::new(8, 30),
    [System.Drawing.Point]::new(11, 19),
    [System.Drawing.Point]::new(5, 13)
)
$g.FillPolygon($brush, $pts)
$g.Dispose()
$icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())

# --- NotifyIcon ---
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $icon
$notify.Text = "Black Ink Studio - servidor ativo"
$notify.Visible = $true

# --- menu de contexto ---
$menu = New-Object System.Windows.Forms.ContextMenuStrip

function New-UrlMenuItem($text, $url) {
    $item = New-Object System.Windows.Forms.ToolStripMenuItem($text)
    $item.add_Click({ Start-Process $url }.GetNewClosure())
    return $item
}

$menu.Items.Add((New-UrlMenuItem "Abrir painel"      "$BaseUrl/admin"))             | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))               | Out-Null
$menu.Items.Add((New-UrlMenuItem "Dashboard"         "$BaseUrl/admin/dashboard"))   | Out-Null
$menu.Items.Add((New-UrlMenuItem "Clientes"          "$BaseUrl/admin/clientes"))    | Out-Null
$menu.Items.Add((New-UrlMenuItem "Agendamentos"      "$BaseUrl/admin/agendamentos"))| Out-Null
$menu.Items.Add((New-UrlMenuItem "QR Code"           "$BaseUrl/admin/qr"))          | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))               | Out-Null
$menu.Items.Add((New-UrlMenuItem "Ficha do cliente"  "$BaseUrl/"))                  | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))               | Out-Null

$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem("Parar servidor e sair")
$exitItem.add_Click({
    $notify.Visible = $false
    $notify.Dispose()
    if ($script:serverProc -and -not $script:serverProc.HasExited) {
        Start-Process "taskkill" -ArgumentList "/PID $($script:serverProc.Id) /T /F" `
            -WindowStyle Hidden -Wait
    }
    [System.Windows.Forms.Application]::Exit()
})
$menu.Items.Add($exitItem) | Out-Null

$notify.ContextMenuStrip = $menu
$notify.add_MouseDoubleClick({ Start-Process "$BaseUrl/admin" })

# --- balao de aviso ao iniciar ---
$notify.ShowBalloonTip(4000, "Black Ink Studio",
    "Servidor ativo em $BaseUrl/admin`nClique no icone da bandeja para abrir.",
    [System.Windows.Forms.ToolTipIcon]::Info)

# --- loop de mensagens (mantem o icone vivo) ---
[System.Windows.Forms.Application]::Run((New-Object System.Windows.Forms.ApplicationContext))
