# captcha-montage.ps1 — 批量取码并拼成一张图，供一次性人工/模型识别
# 用法（授权环境下）:
#   1) 先自行建立 N 个会话并各自取码存为 c_1.png ... c_N.png
#   2) pwsh -File captcha-montage.ps1 -Count 12 -Width 200 -Height 62 -Out cap12.png
param(
  [int]$Count = 12,
  [int]$Width = 200,
  [int]$Height = 62,
  [int]$Cols = 2,
  [string]$Out = "cap12.png",
  [string]$Prefix = "c_"
)
Add-Type -AssemblyName System.Drawing
$rows = [math]::Ceiling($Count / $Cols)
$bmp = New-Object System.Drawing.Bitmap(($Width * $Cols), ($Height * $rows))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
for ($i = 0; $i -lt $Count; $i++) {
  $f = "$Prefix$($i + 1).png"
  if (-not (Test-Path $f)) { Write-Warning "missing $f"; continue }
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $f).Path)
  $col = $i % $Cols
  $row = [math]::Floor($i / $Cols)
  $g.DrawImage($img, ($col * $Width), ($row * $Height), $Width, $Height)
  $img.Dispose()
}
$g.Dispose()
$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "saved $Out  (格子顺序: 左->右, 上->下 = 会话 1..$Count)"
