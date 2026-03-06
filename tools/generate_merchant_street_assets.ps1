Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$tileSize = 32
$tilesetColumns = 8
$tilesetRows = 7
$mapWidth = 64
$mapHeight = 32

$outputDir = 'C:\Users\Ygzz1\Desktop\proj\pixel-room-chat\client\public\assets\tiled'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$tilesetPath = Join-Path $outputDir 'merchant-street-tiles.png'
$mapPath = Join-Path $outputDir 'merchant-street.json'

function New-Brush([string]$hex) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [int]$thickness = 1) {
  return [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $thickness)
}

function Fill-Rect($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = New-Brush $hex
  $graphics.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Fill-Ellipse($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = New-Brush $hex
  $graphics.FillEllipse($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Draw-Line($graphics, [string]$hex, [int]$x1, [int]$y1, [int]$x2, [int]$y2, [int]$thickness = 1) {
  $pen = New-Pen $hex $thickness
  $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
  $pen.Dispose()
}

function Draw-Rect($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h, [int]$thickness = 1) {
  $pen = New-Pen $hex $thickness
  $graphics.DrawRectangle($pen, $x, $y, $w, $h)
  $pen.Dispose()
}

function Get-TileOrigin([int]$gid) {
  $index = $gid - 1
  return @{
    X = ($index % $tilesetColumns) * $tileSize
    Y = [math]::Floor($index / $tilesetColumns) * $tileSize
  }
}

function Clear-Tile($graphics, [int]$gid) {
  $origin = Get-TileOrigin $gid
  $graphics.FillRectangle([System.Drawing.Brushes]::Transparent, $origin.X, $origin.Y, $tileSize, $tileSize)
}

$bmp = [System.Drawing.Bitmap]::new(
  $tilesetColumns * $tileSize,
  $tilesetRows * $tileSize,
  [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$graphics.Clear([System.Drawing.Color]::Transparent)

# 1 sidewalk dark
$o = Get-TileOrigin 1
Fill-Rect $graphics '#182231' $o.X $o.Y 32 32
Fill-Rect $graphics '#22324a' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#2d4565' ($o.X + 3) ($o.Y + 14) 26 2
Fill-Rect $graphics '#31557d' ($o.X + 3) ($o.Y + 24) 26 2
Fill-Rect $graphics '#273851' ($o.X + 7) ($o.Y + 7) 6 6
Fill-Rect $graphics '#273851' ($o.X + 19) ($o.Y + 18) 7 7

# 2 sidewalk glow
$o = Get-TileOrigin 2
Fill-Rect $graphics '#152333' $o.X $o.Y 32 32
Fill-Rect $graphics '#1d3148' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#1dd4ff' ($o.X + 1) ($o.Y + 4) 30 2
Fill-Rect $graphics '#ff58c8' ($o.X + 1) ($o.Y + 26) 30 2
Fill-Rect $graphics '#29435f' ($o.X + 8) ($o.Y + 10) 8 8
Fill-Rect $graphics '#29435f' ($o.X + 18) ($o.Y + 14) 6 6

# 3 wet road
$o = Get-TileOrigin 3
Fill-Rect $graphics '#0a1320' $o.X $o.Y 32 32
Fill-Rect $graphics '#101c2f' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#14263b' ($o.X + 5) ($o.Y + 5) 22 22
Fill-Rect $graphics '#1e7ab7' ($o.X + 8) ($o.Y + 20) 16 2

# 4 wet road alt
$o = Get-TileOrigin 4
Fill-Rect $graphics '#09111b' $o.X $o.Y 32 32
Fill-Rect $graphics '#0f1a2a' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#162338' ($o.X + 4) ($o.Y + 4) 24 24
Fill-Rect $graphics '#a44eff' ($o.X + 6) ($o.Y + 11) 20 2
Fill-Rect $graphics '#13d7ff' ($o.X + 9) ($o.Y + 24) 14 2

# 5 cyan lane
$o = Get-TileOrigin 5
Fill-Rect $graphics '#0a1320' $o.X $o.Y 32 32
Fill-Rect $graphics '#102038' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#13d7ff' ($o.X + 0) ($o.Y + 13) 32 6
Fill-Rect $graphics '#7ff1ff' ($o.X + 4) ($o.Y + 15) 24 2

# 6 magenta lane
$o = Get-TileOrigin 6
Fill-Rect $graphics '#0a1320' $o.X $o.Y 32 32
Fill-Rect $graphics '#102038' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#ff58c8' ($o.X + 0) ($o.Y + 13) 32 6
Fill-Rect $graphics '#ffd0f3' ($o.X + 4) ($o.Y + 15) 24 2

# 7 crosswalk
$o = Get-TileOrigin 7
Fill-Rect $graphics '#0c1524' $o.X $o.Y 32 32
Fill-Rect $graphics '#111f33' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#d6f8ff' ($o.X + 4) ($o.Y + 4) 8 24
Fill-Rect $graphics '#d6f8ff' ($o.X + 20) ($o.Y + 4) 8 24
Fill-Rect $graphics '#32ddff' ($o.X + 0) ($o.Y + 1) 32 2

# 8 plaza grid
$o = Get-TileOrigin 8
Fill-Rect $graphics '#101b2d' $o.X $o.Y 32 32
Fill-Rect $graphics '#17283f' ($o.X + 2) ($o.Y + 2) 28 28
Draw-Rect $graphics '#1ebee2' ($o.X + 1) ($o.Y + 1) 14 14
Draw-Rect $graphics '#1ebee2' ($o.X + 15) ($o.Y + 1) 14 14
Draw-Rect $graphics '#cc5cf3' ($o.X + 1) ($o.Y + 15) 14 14
Draw-Rect $graphics '#cc5cf3' ($o.X + 15) ($o.Y + 15) 14 14

# 9 curb north
$o = Get-TileOrigin 9
Fill-Rect $graphics '#1c2736' $o.X $o.Y 32 32
Fill-Rect $graphics '#51637d' $o.X $o.Y 32 4
Fill-Rect $graphics '#83e8ff' $o.X ($o.Y + 4) 32 2
Fill-Rect $graphics '#22344c' $o.X ($o.Y + 6) 32 26

# 10 curb south
$o = Get-TileOrigin 10
Fill-Rect $graphics '#1c2736' $o.X $o.Y 32 32
Fill-Rect $graphics '#22344c' $o.X $o.Y 32 26
Fill-Rect $graphics '#83e8ff' $o.X ($o.Y + 26) 32 2
Fill-Rect $graphics '#51637d' $o.X ($o.Y + 28) 32 4

# 11 wall dark
$o = Get-TileOrigin 11
Fill-Rect $graphics '#172132' $o.X $o.Y 32 32
Fill-Rect $graphics '#22304a' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#31466a' ($o.X + 2) ($o.Y + 2) 28 5
Fill-Rect $graphics '#101826' ($o.X + 4) ($o.Y + 10) 24 18
Draw-Rect $graphics '#4d668e' ($o.X + 1) ($o.Y + 1) 30 30

# 12 wall cyan windows
$o = Get-TileOrigin 12
Fill-Rect $graphics '#1c2638' $o.X $o.Y 32 32
Fill-Rect $graphics '#293855' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#6deaff' ($o.X + 5) ($o.Y + 8) 8 14
Fill-Rect $graphics '#6deaff' ($o.X + 19) ($o.Y + 8) 8 14
Fill-Rect $graphics '#d1fbff' ($o.X + 8) ($o.Y + 12) 2 6
Fill-Rect $graphics '#d1fbff' ($o.X + 22) ($o.Y + 12) 2 6

# 13 wall magenta windows
$o = Get-TileOrigin 13
Fill-Rect $graphics '#1a2234' $o.X $o.Y 32 32
Fill-Rect $graphics '#2b3552' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#ff71df' ($o.X + 5) ($o.Y + 8) 8 14
Fill-Rect $graphics '#ff71df' ($o.X + 19) ($o.Y + 8) 8 14
Fill-Rect $graphics '#ffd7f7' ($o.X + 8) ($o.Y + 12) 2 6
Fill-Rect $graphics '#ffd7f7' ($o.X + 22) ($o.Y + 12) 2 6

# 14 steel door
$o = Get-TileOrigin 14
Fill-Rect $graphics '#1b2538' $o.X $o.Y 32 32
Fill-Rect $graphics '#2f425e' ($o.X + 8) ($o.Y + 5) 16 24
Fill-Rect $graphics '#476786' ($o.X + 10) ($o.Y + 7) 12 20
Fill-Rect $graphics '#1de3ff' ($o.X + 21) ($o.Y + 17) 2 2
Fill-Rect $graphics '#0a111a' ($o.X + 0) ($o.Y + 28) 32 4

# 15 roof teal
$o = Get-TileOrigin 15
Fill-Rect $graphics '#17324a' $o.X $o.Y 32 32
Fill-Rect $graphics '#2f617e' ($o.X + 0) ($o.Y + 0) 32 7
Fill-Rect $graphics '#79dcff' ($o.X + 2) ($o.Y + 2) 28 2
Fill-Rect $graphics '#10202f' ($o.X + 3) ($o.Y + 13) 26 4
Fill-Rect $graphics '#1f4260' ($o.X + 5) ($o.Y + 21) 22 4

# 16 roof violet
$o = Get-TileOrigin 16
Fill-Rect $graphics '#2a2044' $o.X $o.Y 32 32
Fill-Rect $graphics '#5f3b8c' ($o.X + 0) ($o.Y + 0) 32 7
Fill-Rect $graphics '#f28cff' ($o.X + 2) ($o.Y + 2) 28 2
Fill-Rect $graphics '#1b142d' ($o.X + 3) ($o.Y + 13) 26 4
Fill-Rect $graphics '#402864' ($o.X + 5) ($o.Y + 21) 22 4

# 17 roof machinery
$o = Get-TileOrigin 17
Fill-Rect $graphics '#0f1725' $o.X $o.Y 32 32
Fill-Rect $graphics '#253247' ($o.X + 3) ($o.Y + 4) 26 22
Fill-Rect $graphics '#40617e' ($o.X + 6) ($o.Y + 7) 8 8
Fill-Rect $graphics '#7c8ea8' ($o.X + 18) ($o.Y + 10) 6 12
Draw-Line $graphics '#16d7ff' ($o.X + 4) ($o.Y + 27) ($o.X + 28) ($o.Y + 27) 2

# 18 holo cyan
$o = Get-TileOrigin 18
Clear-Tile $graphics 18
Fill-Rect $graphics '#1be4ff' ($o.X + 5) ($o.Y + 4) 22 16
Fill-Rect $graphics '#aef6ff' ($o.X + 8) ($o.Y + 7) 16 10
Fill-Rect $graphics '#1be4ff' ($o.X + 12) ($o.Y + 20) 8 6
Fill-Rect $graphics '#4a6076' ($o.X + 14) ($o.Y + 26) 4 4

# 19 holo pink
$o = Get-TileOrigin 19
Clear-Tile $graphics 19
Fill-Rect $graphics '#ff64d4' ($o.X + 5) ($o.Y + 4) 22 16
Fill-Rect $graphics '#ffe2fb' ($o.X + 8) ($o.Y + 7) 16 10
Fill-Rect $graphics '#ff64d4' ($o.X + 12) ($o.Y + 20) 8 6
Fill-Rect $graphics '#4a6076' ($o.X + 14) ($o.Y + 26) 4 4

# 20 holo amber
$o = Get-TileOrigin 20
Clear-Tile $graphics 20
Fill-Rect $graphics '#ffa94f' ($o.X + 5) ($o.Y + 4) 22 16
Fill-Rect $graphics '#ffe1bb' ($o.X + 8) ($o.Y + 7) 16 10
Fill-Rect $graphics '#ffa94f' ($o.X + 12) ($o.Y + 20) 8 6
Fill-Rect $graphics '#4a6076' ($o.X + 14) ($o.Y + 26) 4 4

# 21 kiosk cyan
$o = Get-TileOrigin 21
Clear-Tile $graphics 21
Fill-Rect $graphics '#27d8ff' ($o.X + 4) ($o.Y + 5) 24 9
Fill-Rect $graphics '#1e2b40' ($o.X + 7) ($o.Y + 14) 18 10
Fill-Rect $graphics '#9ff3ff' ($o.X + 10) ($o.Y + 17) 12 4
Fill-Rect $graphics '#51657e' ($o.X + 9) ($o.Y + 24) 3 6
Fill-Rect $graphics '#51657e' ($o.X + 20) ($o.Y + 24) 3 6

# 22 kiosk orange
$o = Get-TileOrigin 22
Clear-Tile $graphics 22
Fill-Rect $graphics '#ff9d32' ($o.X + 4) ($o.Y + 5) 24 9
Fill-Rect $graphics '#1e2b40' ($o.X + 7) ($o.Y + 14) 18 10
Fill-Rect $graphics '#ffe3b4' ($o.X + 10) ($o.Y + 17) 12 4
Fill-Rect $graphics '#51657e' ($o.X + 9) ($o.Y + 24) 3 6
Fill-Rect $graphics '#51657e' ($o.X + 20) ($o.Y + 24) 3 6

# 23 lamp cyan
$o = Get-TileOrigin 23
Clear-Tile $graphics 23
Fill-Rect $graphics '#40526c' ($o.X + 14) ($o.Y + 8) 4 20
Fill-Ellipse $graphics '#8df8ff' ($o.X + 8) ($o.Y + 2) 16 14
Fill-Ellipse $graphics '#28d8ff' ($o.X + 6) ($o.Y + 0) 20 18

# 24 lamp pink
$o = Get-TileOrigin 24
Clear-Tile $graphics 24
Fill-Rect $graphics '#40526c' ($o.X + 14) ($o.Y + 8) 4 20
Fill-Ellipse $graphics '#ffd5f4' ($o.X + 8) ($o.Y + 2) 16 14
Fill-Ellipse $graphics '#ff69d7' ($o.X + 6) ($o.Y + 0) 20 18

# 25 vent
$o = Get-TileOrigin 25
Clear-Tile $graphics 25
Fill-Rect $graphics '#455a72' ($o.X + 7) ($o.Y + 10) 18 12
Fill-Rect $graphics '#6d87a1' ($o.X + 9) ($o.Y + 12) 14 3
Fill-Rect $graphics '#6d87a1' ($o.X + 9) ($o.Y + 17) 14 3

# 26 pipe
$o = Get-TileOrigin 26
Clear-Tile $graphics 26
Fill-Rect $graphics '#647a94' ($o.X + 14) ($o.Y + 4) 4 22
Fill-Rect $graphics '#647a94' ($o.X + 8) ($o.Y + 8) 16 4
Fill-Rect $graphics '#1ddcff' ($o.X + 16) ($o.Y + 12) 2 10

# 27 planter
$o = Get-TileOrigin 27
Clear-Tile $graphics 27
Fill-Rect $graphics '#4b5b74' ($o.X + 7) ($o.Y + 19) 18 9
Fill-Ellipse $graphics '#1ce3d0' ($o.X + 4) ($o.Y + 8) 10 10
Fill-Ellipse $graphics '#32ffb7' ($o.X + 11) ($o.Y + 4) 12 12
Fill-Ellipse $graphics '#20c27d' ($o.X + 18) ($o.Y + 9) 8 8

# 28 bench
$o = Get-TileOrigin 28
Clear-Tile $graphics 28
Fill-Rect $graphics '#607187' ($o.X + 4) ($o.Y + 10) 24 3
Fill-Rect $graphics '#8aa4ba' ($o.X + 5) ($o.Y + 15) 22 4
Fill-Rect $graphics '#4b5e76' ($o.X + 8) ($o.Y + 19) 3 8
Fill-Rect $graphics '#4b5e76' ($o.X + 21) ($o.Y + 19) 3 8

# 29 billboard blue
$o = Get-TileOrigin 29
Fill-Rect $graphics '#132134' $o.X $o.Y 32 32
Fill-Rect $graphics '#1ae6ff' ($o.X + 4) ($o.Y + 4) 24 10
Fill-Rect $graphics '#d1f9ff' ($o.X + 8) ($o.Y + 7) 16 4
Fill-Rect $graphics '#2c3c52' ($o.X + 6) ($o.Y + 18) 20 8
Fill-Rect $graphics '#1ae6ff' ($o.X + 9) ($o.Y + 20) 14 2

# 30 billboard magenta
$o = Get-TileOrigin 30
Fill-Rect $graphics '#191f34' $o.X $o.Y 32 32
Fill-Rect $graphics '#ff5fcd' ($o.X + 4) ($o.Y + 4) 24 10
Fill-Rect $graphics '#ffe4fc' ($o.X + 8) ($o.Y + 7) 16 4
Fill-Rect $graphics '#2c3c52' ($o.X + 6) ($o.Y + 18) 20 8
Fill-Rect $graphics '#ff5fcd' ($o.X + 9) ($o.Y + 20) 14 2

# 31 billboard amber
$o = Get-TileOrigin 31
Fill-Rect $graphics '#1a2234' $o.X $o.Y 32 32
Fill-Rect $graphics '#ffb04d' ($o.X + 4) ($o.Y + 4) 24 10
Fill-Rect $graphics '#fff1d4' ($o.X + 8) ($o.Y + 7) 16 4
Fill-Rect $graphics '#2c3c52' ($o.X + 6) ($o.Y + 18) 20 8
Fill-Rect $graphics '#ffb04d' ($o.X + 9) ($o.Y + 20) 14 2

# 32 rail
$o = Get-TileOrigin 32
Fill-Rect $graphics '#141d2b' $o.X $o.Y 32 32
Fill-Rect $graphics '#2f415a' ($o.X + 3) ($o.Y + 12) 26 8
Fill-Rect $graphics '#556987' ($o.X + 5) ($o.Y + 10) 22 2
Fill-Rect $graphics '#556987' ($o.X + 5) ($o.Y + 20) 22 2
Fill-Rect $graphics '#1f2d40' ($o.X + 14) ($o.Y + 4) 4 24

# 33 rail glow
$o = Get-TileOrigin 33
Fill-Rect $graphics '#141d2b' $o.X $o.Y 32 32
Fill-Rect $graphics '#31425e' ($o.X + 3) ($o.Y + 12) 26 8
Fill-Rect $graphics '#32ddff' ($o.X + 5) ($o.Y + 10) 22 2
Fill-Rect $graphics '#ff5fcd' ($o.X + 5) ($o.Y + 20) 22 2
Fill-Rect $graphics '#1f2d40' ($o.X + 14) ($o.Y + 4) 4 24

# 34 holo floor
$o = Get-TileOrigin 34
Fill-Rect $graphics '#0f1725' $o.X $o.Y 32 32
Fill-Rect $graphics '#16263b' ($o.X + 2) ($o.Y + 2) 28 28
Draw-Line $graphics '#22d7ff' ($o.X + 3) ($o.Y + 29) ($o.X + 29) ($o.Y + 3) 1
Draw-Line $graphics '#ff5fcd' ($o.X + 3) ($o.Y + 3) ($o.X + 29) ($o.Y + 29) 1
Draw-Rect $graphics '#7ecfff' ($o.X + 5) ($o.Y + 5) 22 22

# 35 puddle
$o = Get-TileOrigin 35
Fill-Rect $graphics '#0a1320' $o.X $o.Y 32 32
Fill-Rect $graphics '#101c2f' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Ellipse $graphics '#2dd6ff' ($o.X + 4) ($o.Y + 18) 24 8
Fill-Ellipse $graphics '#ff6fdb' ($o.X + 8) ($o.Y + 20) 16 4

# 36 arrow
$o = Get-TileOrigin 36
Fill-Rect $graphics '#0a1320' $o.X $o.Y 32 32
Fill-Rect $graphics '#122039' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#9cefff' ($o.X + 7) ($o.Y + 14) 14 4
Fill-Rect $graphics '#9cefff' ($o.X + 16) ($o.Y + 10) 4 12
Fill-Rect $graphics '#9cefff' ($o.X + 19) ($o.Y + 11) 4 10
Fill-Rect $graphics '#9cefff' ($o.X + 22) ($o.Y + 12) 4 8

# 37 barrier
$o = Get-TileOrigin 37
Clear-Tile $graphics 37
Fill-Rect $graphics '#4d6078' ($o.X + 4) ($o.Y + 20) 24 4
Fill-Rect $graphics '#1ee4ff' ($o.X + 6) ($o.Y + 18) 20 2
Fill-Rect $graphics '#4d6078' ($o.X + 6) ($o.Y + 10) 4 10
Fill-Rect $graphics '#4d6078' ($o.X + 22) ($o.Y + 10) 4 10

# 38 window amber
$o = Get-TileOrigin 38
Fill-Rect $graphics '#1b2437' $o.X $o.Y 32 32
Fill-Rect $graphics '#2a3754' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Rect $graphics '#ffbf6a' ($o.X + 5) ($o.Y + 8) 8 14
Fill-Rect $graphics '#ffbf6a' ($o.X + 19) ($o.Y + 8) 8 14
Fill-Rect $graphics '#fff0cc' ($o.X + 8) ($o.Y + 12) 2 6
Fill-Rect $graphics '#fff0cc' ($o.X + 22) ($o.Y + 12) 2 6

# 39 awning cyan
$o = Get-TileOrigin 39
Fill-Rect $graphics '#1d2535' $o.X $o.Y 32 32
Fill-Rect $graphics '#314864' ($o.X + 3) ($o.Y + 2) 26 6
Fill-Rect $graphics '#1de2ff' ($o.X + 2) ($o.Y + 10) 28 9
Fill-Rect $graphics '#d8fdff' ($o.X + 6) ($o.Y + 10) 4 9
Fill-Rect $graphics '#d8fdff' ($o.X + 16) ($o.Y + 10) 4 9
Fill-Rect $graphics '#0a111b' ($o.X + 4) ($o.Y + 24) 24 3

# 40 awning magenta
$o = Get-TileOrigin 40
Fill-Rect $graphics '#1d2535' $o.X $o.Y 32 32
Fill-Rect $graphics '#314864' ($o.X + 3) ($o.Y + 2) 26 6
Fill-Rect $graphics '#ff63cf' ($o.X + 2) ($o.Y + 10) 28 9
Fill-Rect $graphics '#fff0fb' ($o.X + 6) ($o.Y + 10) 4 9
Fill-Rect $graphics '#fff0fb' ($o.X + 16) ($o.Y + 10) 4 9
Fill-Rect $graphics '#0a111b' ($o.X + 4) ($o.Y + 24) 24 3

# 41 awning amber
$o = Get-TileOrigin 41
Fill-Rect $graphics '#1d2535' $o.X $o.Y 32 32
Fill-Rect $graphics '#314864' ($o.X + 3) ($o.Y + 2) 26 6
Fill-Rect $graphics '#ffae49' ($o.X + 2) ($o.Y + 10) 28 9
Fill-Rect $graphics '#fff0d2' ($o.X + 6) ($o.Y + 10) 4 9
Fill-Rect $graphics '#fff0d2' ($o.X + 16) ($o.Y + 10) 4 9
Fill-Rect $graphics '#0a111b' ($o.X + 4) ($o.Y + 24) 24 3

# 42 holo ring
$o = Get-TileOrigin 42
Clear-Tile $graphics 42
Draw-Rect $graphics '#32ddff' ($o.X + 6) ($o.Y + 6) 20 20 2
Draw-Rect $graphics '#ff64d4' ($o.X + 10) ($o.Y + 10) 12 12 2

# 43 neon tree
$o = Get-TileOrigin 43
Clear-Tile $graphics 43
Fill-Rect $graphics '#55667b' ($o.X + 14) ($o.Y + 21) 4 7
Fill-Ellipse $graphics '#19d5ff' ($o.X + 5) ($o.Y + 8) 10 10
Fill-Ellipse $graphics '#32ffb7' ($o.X + 12) ($o.Y + 4) 12 12
Fill-Ellipse $graphics '#ff6adc' ($o.X + 18) ($o.Y + 8) 9 9

# 44 vertical screen cyan
$o = Get-TileOrigin 44
Clear-Tile $graphics 44
Fill-Rect $graphics '#21324b' ($o.X + 12) ($o.Y + 2) 8 28
Fill-Rect $graphics '#20dcff' ($o.X + 13) ($o.Y + 4) 6 24
Fill-Rect $graphics '#dafbff' ($o.X + 14) ($o.Y + 8) 4 4
Fill-Rect $graphics '#dafbff' ($o.X + 14) ($o.Y + 18) 4 4

# 45 vertical screen pink
$o = Get-TileOrigin 45
Clear-Tile $graphics 45
Fill-Rect $graphics '#21324b' ($o.X + 12) ($o.Y + 2) 8 28
Fill-Rect $graphics '#ff67d5' ($o.X + 13) ($o.Y + 4) 6 24
Fill-Rect $graphics '#fff0fb' ($o.X + 14) ($o.Y + 8) 4 4
Fill-Rect $graphics '#fff0fb' ($o.X + 14) ($o.Y + 18) 4 4

# 46 service pad
$o = Get-TileOrigin 46
Fill-Rect $graphics '#111a2a' $o.X $o.Y 32 32
Fill-Rect $graphics '#18263c' ($o.X + 2) ($o.Y + 2) 28 28
Draw-Rect $graphics '#32ddff' ($o.X + 7) ($o.Y + 7) 18 18 2
Fill-Rect $graphics '#ff67d5' ($o.X + 14) ($o.Y + 6) 4 20

# 47 canopy blue
$o = Get-TileOrigin 47
Clear-Tile $graphics 47
Fill-Rect $graphics '#16e2ff' ($o.X + 2) ($o.Y + 5) 28 8
Fill-Rect $graphics '#e7fdff' ($o.X + 6) ($o.Y + 5) 4 8
Fill-Rect $graphics '#1f2a3b' ($o.X + 6) ($o.Y + 15) 20 9
Fill-Rect $graphics '#586c83' ($o.X + 8) ($o.Y + 24) 3 6
Fill-Rect $graphics '#586c83' ($o.X + 21) ($o.Y + 24) 3 6

# 48 canopy pink
$o = Get-TileOrigin 48
Clear-Tile $graphics 48
Fill-Rect $graphics '#ff64d4' ($o.X + 2) ($o.Y + 5) 28 8
Fill-Rect $graphics '#fff0fb' ($o.X + 6) ($o.Y + 5) 4 8
Fill-Rect $graphics '#1f2a3b' ($o.X + 6) ($o.Y + 15) 20 9
Fill-Rect $graphics '#586c83' ($o.X + 8) ($o.Y + 24) 3 6
Fill-Rect $graphics '#586c83' ($o.X + 21) ($o.Y + 24) 3 6

# 49 canopy amber
$o = Get-TileOrigin 49
Clear-Tile $graphics 49
Fill-Rect $graphics '#ffb04d' ($o.X + 2) ($o.Y + 5) 28 8
Fill-Rect $graphics '#fff3dc' ($o.X + 6) ($o.Y + 5) 4 8
Fill-Rect $graphics '#1f2a3b' ($o.X + 6) ($o.Y + 15) 20 9
Fill-Rect $graphics '#586c83' ($o.X + 8) ($o.Y + 24) 3 6
Fill-Rect $graphics '#586c83' ($o.X + 21) ($o.Y + 24) 3 6

# 50 neon divider
$o = Get-TileOrigin 50
Fill-Rect $graphics '#0d1623' $o.X $o.Y 32 32
Fill-Rect $graphics '#32435a' ($o.X + 14) ($o.Y + 0) 4 32
Fill-Rect $graphics '#1fe0ff' ($o.X + 12) ($o.Y + 2) 8 4
Fill-Rect $graphics '#ff67d5' ($o.X + 12) ($o.Y + 26) 8 4

# 51 wall teal grid
$o = Get-TileOrigin 51
Fill-Rect $graphics '#162335' $o.X $o.Y 32 32
Fill-Rect $graphics '#25364e' ($o.X + 2) ($o.Y + 2) 28 28
Draw-Rect $graphics '#1bdcff' ($o.X + 5) ($o.Y + 8) 8 8
Draw-Rect $graphics '#1bdcff' ($o.X + 19) ($o.Y + 8) 8 8
Draw-Rect $graphics '#1bdcff' ($o.X + 5) ($o.Y + 18) 8 8
Draw-Rect $graphics '#1bdcff' ($o.X + 19) ($o.Y + 18) 8 8

# 52 wall magenta grid
$o = Get-TileOrigin 52
Fill-Rect $graphics '#1b2237' $o.X $o.Y 32 32
Fill-Rect $graphics '#293452' ($o.X + 2) ($o.Y + 2) 28 28
Draw-Rect $graphics '#ff68d6' ($o.X + 5) ($o.Y + 8) 8 8
Draw-Rect $graphics '#ff68d6' ($o.X + 19) ($o.Y + 8) 8 8
Draw-Rect $graphics '#ff68d6' ($o.X + 5) ($o.Y + 18) 8 8
Draw-Rect $graphics '#ff68d6' ($o.X + 19) ($o.Y + 18) 8 8

# 53 holo ad cyan
$o = Get-TileOrigin 53
Clear-Tile $graphics 53
Fill-Rect $graphics '#2be4ff' ($o.X + 8) ($o.Y + 3) 16 22
Fill-Rect $graphics '#d9fcff' ($o.X + 11) ($o.Y + 6) 10 4
Fill-Rect $graphics '#d9fcff' ($o.X + 11) ($o.Y + 14) 10 4
Fill-Rect $graphics '#415369' ($o.X + 14) ($o.Y + 25) 4 4

# 54 holo ad magenta
$o = Get-TileOrigin 54
Clear-Tile $graphics 54
Fill-Rect $graphics '#ff67d5' ($o.X + 8) ($o.Y + 3) 16 22
Fill-Rect $graphics '#fff0fb' ($o.X + 11) ($o.Y + 6) 10 4
Fill-Rect $graphics '#fff0fb' ($o.X + 11) ($o.Y + 14) 10 4
Fill-Rect $graphics '#415369' ($o.X + 14) ($o.Y + 25) 4 4

# 55 data tree
$o = Get-TileOrigin 55
Clear-Tile $graphics 55
Fill-Rect $graphics '#56687d' ($o.X + 14) ($o.Y + 22) 4 6
Draw-Line $graphics '#21dcff' ($o.X + 16) ($o.Y + 10) ($o.X + 9) ($o.Y + 16) 2
Draw-Line $graphics '#ff67d5' ($o.X + 16) ($o.Y + 10) ($o.X + 23) ($o.Y + 16) 2
Draw-Line $graphics '#30ffb8' ($o.X + 16) ($o.Y + 10) ($o.X + 16) ($o.Y + 4) 2
Fill-Ellipse $graphics '#21dcff' ($o.X + 6) ($o.Y + 14) 6 6
Fill-Ellipse $graphics '#ff67d5' ($o.X + 20) ($o.Y + 14) 6 6
Fill-Ellipse $graphics '#30ffb8' ($o.X + 13) ($o.Y + 2) 6 6

# 56 holo floor circle
$o = Get-TileOrigin 56
Fill-Rect $graphics '#0e1522' $o.X $o.Y 32 32
Fill-Rect $graphics '#162238' ($o.X + 2) ($o.Y + 2) 28 28
Fill-Ellipse $graphics '#1ee0ff' ($o.X + 6) ($o.Y + 6) 20 20
Fill-Ellipse $graphics '#11223b' ($o.X + 10) ($o.Y + 10) 12 12
Fill-Ellipse $graphics '#ff67d5' ($o.X + 12) ($o.Y + 12) 8 8

$bmp.Save($tilesetPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()

$ground = New-Object 'int[]' ($mapWidth * $mapHeight)
$structures = New-Object 'int[]' ($mapWidth * $mapHeight)
$decor = New-Object 'int[]' ($mapWidth * $mapHeight)

function Set-Tile([int[]]$layer, [int]$x, [int]$y, [int]$gid) {
  if ($x -lt 0 -or $x -ge $mapWidth -or $y -lt 0 -or $y -ge $mapHeight) {
    return
  }

  $layer[$y * $mapWidth + $x] = $gid
}

function Fill-Area([int[]]$layer, [int]$x, [int]$y, [int]$w, [int]$h, [int]$gid) {
  for ($iy = $y; $iy -lt ($y + $h); $iy++) {
    for ($ix = $x; $ix -lt ($x + $w); $ix++) {
      Set-Tile $layer $ix $iy $gid
    }
  }
}

function To-JsonArray([int[]]$values) {
  return @($values | ForEach-Object { [int]$_ })
}

for ($y = 0; $y -lt $mapHeight; $y++) {
  for ($x = 0; $x -lt $mapWidth; $x++) {
    $baseTile = if ((($x * 5) + ($y * 3)) % 9 -eq 0) { 2 } else { 1 }
    Set-Tile $ground $x $y $baseTile
  }
}

Fill-Area $ground 0 10 $mapWidth 2 9
Fill-Area $ground 0 12 $mapWidth 8 3
Fill-Area $ground 0 18 $mapWidth 2 4

for ($x = 0; $x -lt $mapWidth; $x++) {
  Set-Tile $ground $x 11 9
  Set-Tile $ground $x 20 10
}

for ($y = 12; $y -le 19; $y++) {
  for ($x = 0; $x -lt $mapWidth; $x++) {
    $tile = if ((($x + $y) % 5) -eq 0) { 4 } else { 3 }
    Set-Tile $ground $x $y $tile
  }
}

for ($x = 4; $x -lt $mapWidth - 4; $x += 6) {
  Set-Tile $ground $x 15 5
  Set-Tile $ground ($x + 1) 15 5
  Set-Tile $ground ($x + 2) 16 6
  Set-Tile $ground ($x + 3) 16 6
}

foreach ($crosswalkStart in @(12, 46)) {
  for ($x = $crosswalkStart; $x -lt ($crosswalkStart + 3); $x++) {
    for ($y = 11; $y -le 20; $y++) {
      Set-Tile $ground $x $y 7
    }
  }
}

Fill-Area $ground 27 5 10 4 8
for ($x = 28; $x -le 35; $x++) {
  Set-Tile $ground $x 6 34
  Set-Tile $ground $x 7 56
}

for ($x = 19; $x -le 44; $x++) {
  Set-Tile $ground $x 24 8
  Set-Tile $ground $x 25 8
}
for ($x = 21; $x -lt 43; $x += 4) {
  Set-Tile $ground $x 24 35
  Set-Tile $ground ($x + 1) 25 46
}

function Add-CyberBlock([int]$x, [int]$width, [int]$roofGid, [int]$wallGid, [int]$awningGid, [int]$signGid, [int]$screenGid) {
  Fill-Area $structures $x 2 $width 2 $roofGid
  Fill-Area $structures $x 4 $width 1 17
  Fill-Area $structures $x 5 $width 1 11
  Fill-Area $structures $x 6 $width 2 $wallGid
  Fill-Area $structures $x 8 $width 1 $awningGid
  Fill-Area $structures $x 9 $width 1 11

  for ($ix = $x + 1; $ix -lt ($x + $width - 1); $ix += 2) {
    Set-Tile $structures $ix 6 $wallGid
    Set-Tile $structures $ix 7 $wallGid
  }

  $doorX = $x + [math]::Floor($width / 2)
  Set-Tile $structures $doorX 9 14
  Set-Tile $decor ($x + 1) 5 $signGid
  Set-Tile $decor ($x + $width - 2) 5 $screenGid
  Set-Tile $decor ($x + $width - 3) 4 25
  Set-Tile $decor ($x + 2) 4 26
}

Add-CyberBlock 2 11 15 12 39 29 44
Add-CyberBlock 15 10 16 13 40 30 45
Add-CyberBlock 27 10 15 51 41 31 53
Add-CyberBlock 39 10 16 52 39 29 54
Add-CyberBlock 51 11 15 38 40 30 44

function Add-LowerTower([int]$x, [int]$width, [int]$roofGid, [int]$wallGid, [int]$awningGid, [int]$signGid) {
  Fill-Area $structures $x 23 $width 1 $roofGid
  Fill-Area $structures $x 24 $width 1 17
  Fill-Area $structures $x 25 $width 1 11
  Fill-Area $structures $x 26 $width 2 $wallGid
  Fill-Area $structures $x 28 $width 1 $awningGid
  Fill-Area $structures $x 29 $width 1 11

  for ($ix = $x + 1; $ix -lt ($x + $width - 1); $ix += 2) {
    Set-Tile $structures $ix 26 $wallGid
    Set-Tile $structures $ix 27 $wallGid
  }

  $doorX = $x + [math]::Floor($width / 2)
  Set-Tile $structures $doorX 29 14
  Set-Tile $decor ($x + 1) 25 $signGid
  Set-Tile $decor ($x + $width - 2) 24 42
}

Add-LowerTower 3 12 15 12 39 29
Add-LowerTower 18 10 16 38 41 31
Add-LowerTower 30 10 15 51 40 30
Add-LowerTower 42 9 16 52 39 29
Add-LowerTower 53 8 15 12 41 31

foreach ($lamp in @(
  @{ X = 4; Y = 10; Gid = 23 },
  @{ X = 12; Y = 10; Gid = 24 },
  @{ X = 20; Y = 10; Gid = 23 },
  @{ X = 28; Y = 10; Gid = 24 },
  @{ X = 36; Y = 10; Gid = 23 },
  @{ X = 44; Y = 10; Gid = 24 },
  @{ X = 52; Y = 10; Gid = 23 },
  @{ X = 60; Y = 10; Gid = 24 },
  @{ X = 7; Y = 21; Gid = 24 },
  @{ X = 16; Y = 21; Gid = 23 },
  @{ X = 25; Y = 21; Gid = 24 },
  @{ X = 39; Y = 21; Gid = 23 },
  @{ X = 48; Y = 21; Gid = 24 },
  @{ X = 58; Y = 21; Gid = 23 }
)) {
  Set-Tile $decor $lamp.X $lamp.Y $lamp.Gid
}

foreach ($dividerX in @(9, 18, 27, 36, 45, 54)) {
  Set-Tile $decor $dividerX 15 50
  Set-Tile $decor $dividerX 16 50
}

foreach ($screen in @(
  @{ X = 6; Y = 12; Gid = 18 },
  @{ X = 57; Y = 12; Gid = 19 },
  @{ X = 8; Y = 18; Gid = 20 },
  @{ X = 55; Y = 18; Gid = 18 }
)) {
  Set-Tile $decor $screen.X $screen.Y $screen.Gid
}

foreach ($item in @(
  @{ X = 22; Y = 24; Gid = 47 },
  @{ X = 26; Y = 24; Gid = 48 },
  @{ X = 30; Y = 24; Gid = 49 },
  @{ X = 34; Y = 24; Gid = 47 },
  @{ X = 38; Y = 24; Gid = 48 }
)) {
  Set-Tile $decor $item.X $item.Y $item.Gid
}

foreach ($tree in @(
  @{ X = 9; Y = 8; Gid = 43 },
  @{ X = 54; Y = 8; Gid = 55 },
  @{ X = 10; Y = 23; Gid = 55 },
  @{ X = 53; Y = 23; Gid = 43 }
)) {
  Set-Tile $decor $tree.X $tree.Y $tree.Gid
}

foreach ($planter in @(
  @{ X = 15; Y = 10 },
  @{ X = 24; Y = 10 },
  @{ X = 40; Y = 10 },
  @{ X = 49; Y = 10 },
  @{ X = 14; Y = 21 },
  @{ X = 50; Y = 21 }
)) {
  Set-Tile $decor $planter.X $planter.Y 27
}

foreach ($bench in @(
  @{ X = 29; Y = 9 },
  @{ X = 33; Y = 9 },
  @{ X = 27; Y = 26 },
  @{ X = 36; Y = 26 }
)) {
  Set-Tile $decor $bench.X $bench.Y 28
}

Set-Tile $decor 30 6 42
Set-Tile $decor 33 6 42
Set-Tile $decor 31 7 56
Set-Tile $decor 32 7 56

foreach ($kiosk in @(
  @{ X = 19; Y = 22; Gid = 21 },
  @{ X = 43; Y = 22; Gid = 22 },
  @{ X = 20; Y = 27; Gid = 21 },
  @{ X = 42; Y = 27; Gid = 22 }
)) {
  Set-Tile $decor $kiosk.X $kiosk.Y $kiosk.Gid
}

foreach ($barrier in 24..39) {
  if ($barrier % 2 -eq 0) {
    Set-Tile $decor $barrier 13 37
  }
}

$shopSigns = @(
  @{
    height = 32
    id = 1
    name = 'BYTE CAFE'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 168
    x = 84
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#35e7ff' },
      @{ name = 'size'; type = 'int'; value = 22 },
      @{ name = 'caption'; type = 'string'; value = 'synth brews' }
    )
  },
  @{
    height = 32
    id = 2
    name = 'PULSE CLUB'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 168
    x = 500
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#ff66d6' },
      @{ name = 'size'; type = 'int'; value = 22 },
      @{ name = 'caption'; type = 'string'; value = 'all-night sets' }
    )
  },
  @{
    height = 32
    id = 3
    name = 'SKY MALL'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 164
    x = 888
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#ffb04d' },
      @{ name = 'size'; type = 'int'; value = 22 },
      @{ name = 'caption'; type = 'string'; value = 'premium mods' }
    )
  },
  @{
    height = 32
    id = 4
    name = 'ZERO-ONE'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 164
    x = 1272
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#35e7ff' },
      @{ name = 'size'; type = 'int'; value = 22 },
      @{ name = 'caption'; type = 'string'; value = 'holo gadgets' }
    )
  },
  @{
    height = 32
    id = 5
    name = 'CLOUD BAR'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 168
    x = 1650
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#ff66d6' },
      @{ name = 'size'; type = 'int'; value = 22 },
      @{ name = 'caption'; type = 'string'; value = 'rooftop lounge' }
    )
  },
  @{
    height = 32
    id = 6
    name = 'DATA BAZAAR'
    rotation = 0
    type = 'district'
    visible = $true
    width = 220
    x = 820
    y = 840
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#fff2b3' },
      @{ name = 'size'; type = 'int'; value = 24 },
      @{ name = 'caption'; type = 'string'; value = 'street market 24/7' }
    )
  }
)

$map = [ordered]@{
  compressionlevel = -1
  height = $mapHeight
  infinite = $false
  layers = @(
    [ordered]@{
      data = To-JsonArray $ground
      height = $mapHeight
      id = 1
      name = 'Ground'
      opacity = 1
      type = 'tilelayer'
      visible = $true
      width = $mapWidth
      x = 0
      y = 0
    },
    [ordered]@{
      data = To-JsonArray $structures
      height = $mapHeight
      id = 2
      name = 'Structures'
      opacity = 1
      type = 'tilelayer'
      visible = $true
      width = $mapWidth
      x = 0
      y = 0
    },
    [ordered]@{
      data = To-JsonArray $decor
      height = $mapHeight
      id = 3
      name = 'Decor'
      opacity = 1
      type = 'tilelayer'
      visible = $true
      width = $mapWidth
      x = 0
      y = 0
    },
    [ordered]@{
      draworder = 'topdown'
      id = 4
      name = 'ShopSigns'
      objects = $shopSigns
      opacity = 1
      type = 'objectgroup'
      visible = $true
      x = 0
      y = 0
    }
  )
  nextlayerid = 5
  nextobjectid = 7
  orientation = 'orthogonal'
  renderorder = 'right-down'
  tiledversion = '1.11.0'
  tileheight = $tileSize
  tilesets = @(
    [ordered]@{
      columns = $tilesetColumns
      firstgid = 1
      image = 'merchant-street-tiles.png'
      imageheight = $tilesetRows * $tileSize
      imagewidth = $tilesetColumns * $tileSize
      margin = 0
      name = 'merchant-street-tiles'
      spacing = 0
      tilecount = $tilesetColumns * $tilesetRows
      tileheight = $tileSize
      tilewidth = $tileSize
    }
  )
  tilewidth = $tileSize
  type = 'map'
  version = '1.10'
  width = $mapWidth
}

$json = $map | ConvertTo-Json -Depth 14
[System.IO.File]::WriteAllText($mapPath, $json, [System.Text.Encoding]::UTF8)

Write-Output "Generated $tilesetPath"
Write-Output "Generated $mapPath"
