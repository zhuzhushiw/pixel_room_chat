Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'

$tileSize = 32
$tilesetColumns = 8
$tilesetRows = 5
$mapWidth = 64
$mapHeight = 32

$outputDir = 'C:\Users\Ygzz1\Desktop\proj\pixel-room-chat\client\public\assets\tiled'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$tilesetPath = Join-Path $outputDir 'merchant-street-tiles.png'
$mapPath = Join-Path $outputDir 'merchant-street.json'

function Fill-Rect($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
  $graphics.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Clear-Tile($graphics, [int]$gid) {
  $origin = Get-TileOrigin $gid
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::Transparent)
  $graphics.FillRectangle($brush, $origin.X, $origin.Y, $tileSize, $tileSize)
  $brush.Dispose()
}

function Fill-Ellipse($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
  $graphics.FillEllipse($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Draw-Rect($graphics, [string]$hex, [int]$x, [int]$y, [int]$w, [int]$h, [int]$thickness = 1) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $thickness)
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

function Fill-TileBase($graphics, [int]$gid, [string]$hex) {
  $origin = Get-TileOrigin $gid
  Fill-Rect $graphics $hex $origin.X $origin.Y $tileSize $tileSize
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

# 1 grass
$o = Get-TileOrigin 1
Fill-Rect $graphics '#71b66f' $o.X $o.Y 32 32
Fill-Rect $graphics '#6ba566' ($o.X + 4) ($o.Y + 6) 6 6
Fill-Rect $graphics '#8cc67e' ($o.X + 18) ($o.Y + 8) 8 5
Fill-Rect $graphics '#5c9159' ($o.X + 10) ($o.Y + 19) 9 6
Fill-Rect $graphics '#8dcf7e' ($o.X + 22) ($o.Y + 22) 5 5

# 2 flower grass
$o = Get-TileOrigin 2
Fill-Rect $graphics '#77bc74' $o.X $o.Y 32 32
Fill-Rect $graphics '#fbeb8b' ($o.X + 6) ($o.Y + 7) 3 3
Fill-Rect $graphics '#ff88ae' ($o.X + 16) ($o.Y + 10) 3 3
Fill-Rect $graphics '#fff3a2' ($o.X + 25) ($o.Y + 21) 2 2
Fill-Rect $graphics '#5d9159' ($o.X + 8) ($o.Y + 18) 8 6

# 3 sidewalk
$o = Get-TileOrigin 3
Fill-Rect $graphics '#cfd4dd' $o.X $o.Y 32 32
Draw-Rect $graphics '#b2bac7' ($o.X + 1) ($o.Y + 1) 30 30
Draw-Rect $graphics '#bac1cd' ($o.X + 1) ($o.Y + 1) 14 14
Draw-Rect $graphics '#bac1cd' ($o.X + 15) ($o.Y + 1) 14 14
Draw-Rect $graphics '#bac1cd' ($o.X + 1) ($o.Y + 15) 14 14
Draw-Rect $graphics '#bac1cd' ($o.X + 15) ($o.Y + 15) 14 14

# 4 sidewalk dark
$o = Get-TileOrigin 4
Fill-Rect $graphics '#bcc4d0' $o.X $o.Y 32 32
Draw-Rect $graphics '#9ba4b1' ($o.X + 1) ($o.Y + 1) 30 30
Fill-Rect $graphics '#d4dbe5' ($o.X + 4) ($o.Y + 4) 9 9
Fill-Rect $graphics '#ced5de' ($o.X + 18) ($o.Y + 6) 9 7
Fill-Rect $graphics '#a5aebb' ($o.X + 8) ($o.Y + 20) 14 5

# 5 road
$o = Get-TileOrigin 5
Fill-Rect $graphics '#454d58' $o.X $o.Y 32 32
Fill-Rect $graphics '#4d5562' ($o.X + 4) ($o.Y + 4) 24 24

# 6 road dash
$o = Get-TileOrigin 6
Fill-Rect $graphics '#454d58' $o.X $o.Y 32 32
Fill-Rect $graphics '#4d5562' ($o.X + 4) ($o.Y + 4) 24 24
Fill-Rect $graphics '#f6f0ce' ($o.X + 7) ($o.Y + 13) 18 6

# 7 curb
$o = Get-TileOrigin 7
Fill-Rect $graphics '#cfd4dd' $o.X $o.Y 32 32
Fill-Rect $graphics '#8a929e' $o.X ($o.Y + 24) 32 4
Fill-Rect $graphics '#b6beca' $o.X ($o.Y + 28) 32 4

# 8 plaza
$o = Get-TileOrigin 8
Fill-Rect $graphics '#d8d5cc' $o.X $o.Y 32 32
Draw-Rect $graphics '#c0bcae' ($o.X + 1) ($o.Y + 1) 14 14
Draw-Rect $graphics '#c0bcae' ($o.X + 15) ($o.Y + 1) 14 14
Draw-Rect $graphics '#c0bcae' ($o.X + 1) ($o.Y + 15) 14 14
Draw-Rect $graphics '#c0bcae' ($o.X + 15) ($o.Y + 15) 14 14

# 9 wall
$o = Get-TileOrigin 9
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#dadee4' ($o.X + 2) ($o.Y + 2) 28 6
Draw-Rect $graphics '#495364' ($o.X + 1) ($o.Y + 1) 30 30 2

# 10 window wall
$o = Get-TileOrigin 10
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#b8d8eb' ($o.X + 5) ($o.Y + 7) 22 16
Fill-Rect $graphics '#8badc4' ($o.X + 7) ($o.Y + 9) 18 12
Fill-Rect $graphics '#495364' ($o.X + 15) ($o.Y + 7) 2 16
Draw-Rect $graphics '#495364' ($o.X + 4) ($o.Y + 6) 24 18 2

# 11 door wall
$o = Get-TileOrigin 11
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#5c6778' ($o.X + 10) ($o.Y + 6) 12 24
Fill-Rect $graphics '#7d8ba0' ($o.X + 12) ($o.Y + 8) 8 20
Fill-Rect $graphics '#f3d27a' ($o.X + 19) ($o.Y + 18) 2 2

# 12 roof red
$o = Get-TileOrigin 12
Fill-Rect $graphics '#c8635c' $o.X $o.Y 32 32
Fill-Rect $graphics '#e48a7b' ($o.X + 2) ($o.Y + 2) 28 6
Fill-Rect $graphics '#9f433f' ($o.X + 3) ($o.Y + 12) 26 4
Fill-Rect $graphics '#b95450' ($o.X + 5) ($o.Y + 20) 22 4

# 13 roof brown
$o = Get-TileOrigin 13
Fill-Rect $graphics '#9f6a44' $o.X $o.Y 32 32
Fill-Rect $graphics '#c78f64' ($o.X + 2) ($o.Y + 2) 28 6
Fill-Rect $graphics '#7b4f35' ($o.X + 3) ($o.Y + 12) 26 4
Fill-Rect $graphics '#8b5c3e' ($o.X + 5) ($o.Y + 20) 22 4

# 14 awning red
$o = Get-TileOrigin 14
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#f4f0e6' ($o.X + 2) ($o.Y + 2) 28 8
Fill-Rect $graphics '#d9534f' ($o.X + 2) ($o.Y + 10) 28 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 6) ($o.Y + 10) 4 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 16) ($o.Y + 10) 4 10
Fill-Rect $graphics '#c23e3a' ($o.X + 2) ($o.Y + 22) 28 4

# 15 awning blue
$o = Get-TileOrigin 15
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#f4f0e6' ($o.X + 2) ($o.Y + 2) 28 8
Fill-Rect $graphics '#4e89d8' ($o.X + 2) ($o.Y + 10) 28 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 6) ($o.Y + 10) 4 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 16) ($o.Y + 10) 4 10
Fill-Rect $graphics '#3869b1' ($o.X + 2) ($o.Y + 22) 28 4

# 16 awning green
$o = Get-TileOrigin 16
Fill-Rect $graphics '#eee9de' $o.X $o.Y 32 32
Fill-Rect $graphics '#f4f0e6' ($o.X + 2) ($o.Y + 2) 28 8
Fill-Rect $graphics '#4da46f' ($o.X + 2) ($o.Y + 10) 28 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 6) ($o.Y + 10) 4 10
Fill-Rect $graphics '#f8f0e8' ($o.X + 16) ($o.Y + 10) 4 10
Fill-Rect $graphics '#357c55' ($o.X + 2) ($o.Y + 22) 28 4

# 17 tree canopy
$o = Get-TileOrigin 17
Clear-Tile $graphics 17
Fill-Ellipse $graphics '#4fa56b' ($o.X + 4) ($o.Y + 8) 12 12
Fill-Ellipse $graphics '#5cb875' ($o.X + 11) ($o.Y + 4) 14 14
Fill-Ellipse $graphics '#47905d' ($o.X + 18) ($o.Y + 10) 10 10
Fill-Rect $graphics '#6e7789' ($o.X + 12) ($o.Y + 22) 8 6

# 18 planter
$o = Get-TileOrigin 18
Clear-Tile $graphics 18
Fill-Rect $graphics '#6b7486' ($o.X + 8) ($o.Y + 18) 16 10
Fill-Ellipse $graphics '#4ea067' ($o.X + 4) ($o.Y + 6) 12 12
Fill-Ellipse $graphics '#66b67b' ($o.X + 12) ($o.Y + 3) 13 13
Fill-Ellipse $graphics '#4a8b5e' ($o.X + 18) ($o.Y + 8) 9 9

# 19 bench
$o = Get-TileOrigin 19
Clear-Tile $graphics 19
Fill-Rect $graphics '#965f39' ($o.X + 5) ($o.Y + 13) 22 4
Fill-Rect $graphics '#6c7585' ($o.X + 4) ($o.Y + 9) 24 3
Fill-Rect $graphics '#7b4c2f' ($o.X + 8) ($o.Y + 17) 3 8
Fill-Rect $graphics '#7b4c2f' ($o.X + 21) ($o.Y + 17) 3 8

# 20 lamp
$o = Get-TileOrigin 20
Clear-Tile $graphics 20
Fill-Rect $graphics '#4a5365' ($o.X + 14) ($o.Y + 7) 4 18
Fill-Ellipse $graphics '#ffefad' ($o.X + 9) ($o.Y + 3) 14 14
Fill-Ellipse $graphics '#ffefad' ($o.X + 6) ($o.Y + 0) 20 20

# 21 fountain water
$o = Get-TileOrigin 21
Fill-Rect $graphics '#d8d5cc' $o.X $o.Y 32 32
Fill-Ellipse $graphics '#68bef3' ($o.X + 4) ($o.Y + 4) 24 24
Fill-Ellipse $graphics '#c7f2ff' ($o.X + 11) ($o.Y + 11) 10 10

# 22 fountain rim
$o = Get-TileOrigin 22
Fill-Rect $graphics '#d8d5cc' $o.X $o.Y 32 32
Fill-Ellipse $graphics '#b8bec8' ($o.X + 3) ($o.Y + 3) 26 26
Fill-Ellipse $graphics '#66b7ec' ($o.X + 8) ($o.Y + 8) 16 16

# 23 stall yellow
$o = Get-TileOrigin 23
Clear-Tile $graphics 23
Fill-Rect $graphics '#f0c650' ($o.X + 2) ($o.Y + 4) 28 10
Fill-Rect $graphics '#f9eed4' ($o.X + 6) ($o.Y + 14) 20 10
Fill-Rect $graphics '#465066' ($o.X + 8) ($o.Y + 24) 3 6
Fill-Rect $graphics '#465066' ($o.X + 21) ($o.Y + 24) 3 6

# 24 stall teal
$o = Get-TileOrigin 24
Clear-Tile $graphics 24
Fill-Rect $graphics '#58b8cf' ($o.X + 2) ($o.Y + 4) 28 10
Fill-Rect $graphics '#f9eed4' ($o.X + 6) ($o.Y + 14) 20 10
Fill-Rect $graphics '#465066' ($o.X + 8) ($o.Y + 24) 3 6
Fill-Rect $graphics '#465066' ($o.X + 21) ($o.Y + 24) 3 6

# 25 stall base
$o = Get-TileOrigin 25
Clear-Tile $graphics 25
Fill-Rect $graphics '#e8dfcf' ($o.X + 6) ($o.Y + 9) 20 12
Fill-Rect $graphics '#7d8b9d' ($o.X + 8) ($o.Y + 21) 3 8
Fill-Rect $graphics '#7d8b9d' ($o.X + 21) ($o.Y + 21) 3 8

# 26 hedge
$o = Get-TileOrigin 26
Fill-Rect $graphics '#4a9b68' $o.X $o.Y 32 32
Fill-Rect $graphics '#5bb377' ($o.X + 2) ($o.Y + 2) 10 8
Fill-Rect $graphics '#61b67e' ($o.X + 18) ($o.Y + 6) 8 8
Fill-Rect $graphics '#3f8459' ($o.X + 10) ($o.Y + 18) 12 8

# 27 flower bed
$o = Get-TileOrigin 27
Fill-Rect $graphics '#596675' $o.X $o.Y 32 32
Fill-Rect $graphics '#ab7f54' ($o.X + 3) ($o.Y + 8) 26 16
Fill-Rect $graphics '#ff86a5' ($o.X + 6) ($o.Y + 11) 3 3
Fill-Rect $graphics '#f5e58a' ($o.X + 13) ($o.Y + 13) 3 3
Fill-Rect $graphics '#77d07b' ($o.X + 20) ($o.Y + 10) 3 3

# 28 shadow
$o = Get-TileOrigin 28
Fill-Rect $graphics '#000000' $o.X $o.Y 32 32
Fill-Rect $graphics '#0e1420' ($o.X + 4) ($o.Y + 4) 24 24

# 29-35 label plaques
$labelColors = @('#d9534f', '#6c8fd9', '#f5b64a', '#53a97a', '#4f80e2', '#ec6e93', '#51ba9b')
for ($gid = 29; $gid -le 35; $gid++) {
  $o = Get-TileOrigin $gid
  $color = $labelColors[$gid - 29]
  Fill-Rect $graphics '#ede7d8' $o.X $o.Y 32 32
  Fill-Rect $graphics $color ($o.X + 4) ($o.Y + 5) 24 8
  Fill-Rect $graphics '#3a4456' ($o.X + 7) ($o.Y + 16) 18 3
  Fill-Rect $graphics '#3a4456' ($o.X + 7) ($o.Y + 22) 12 3
}

# 36 brick path
$o = Get-TileOrigin 36
Fill-Rect $graphics '#d2b58b' $o.X $o.Y 32 32
for ($row = 0; $row -lt 4; $row++) {
  $offset = if ($row % 2 -eq 0) { 0 } else { 6 }
  for ($col = 0; $col -lt 4; $col++) {
    Fill-Rect $graphics '#c29f75' ($o.X + $offset + $col * 8) ($o.Y + 2 + $row * 7) 7 5
  }
}

# 37 decorative stripe
$o = Get-TileOrigin 37
Fill-Rect $graphics '#b9c2ce' $o.X $o.Y 32 32
Fill-Rect $graphics '#8b97a8' ($o.X + 1) ($o.Y + 13) 30 6
Fill-Rect $graphics '#d6dce5' ($o.X + 1) ($o.Y + 2) 30 5
Fill-Rect $graphics '#d6dce5' ($o.X + 1) ($o.Y + 25) 30 5

# 38 crosswalk
$o = Get-TileOrigin 38
Fill-Rect $graphics '#454d58' $o.X $o.Y 32 32
Fill-Rect $graphics '#e9e3d7' ($o.X + 4) ($o.Y + 4) 8 24
Fill-Rect $graphics '#e9e3d7' ($o.X + 20) ($o.Y + 4) 8 24

# 39 wall dark
$o = Get-TileOrigin 39
Fill-Rect $graphics '#d7dce3' $o.X $o.Y 32 32
Fill-Rect $graphics '#3e485b' ($o.X + 2) ($o.Y + 2) 28 6
Fill-Rect $graphics '#f2eee5' ($o.X + 3) ($o.Y + 10) 26 18

# 40 roof teal
$o = Get-TileOrigin 40
Fill-Rect $graphics '#4a8197' $o.X $o.Y 32 32
Fill-Rect $graphics '#6ba3bb' ($o.X + 2) ($o.Y + 2) 28 6
Fill-Rect $graphics '#346678' ($o.X + 3) ($o.Y + 12) 26 4
Fill-Rect $graphics '#3d7388' ($o.X + 5) ($o.Y + 20) 22 4

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
    $gid = if ((($x * 3) + $y) % 11 -eq 0) { 2 } else { 1 }
    Set-Tile $ground $x $y $gid
  }
}

Fill-Area $ground 0 9 $mapWidth 3 3
Fill-Area $ground 0 20 $mapWidth 3 3
Fill-Area $ground 0 12 $mapWidth 8 5
for ($x = 0; $x -lt $mapWidth; $x++) {
  Set-Tile $ground $x 11 7
  Set-Tile $ground $x 20 7
}

for ($x = 2; $x -lt $mapWidth - 2; $x += 4) {
  Set-Tile $ground $x 15 6
  Set-Tile $ground ($x + 1) 15 6
}

foreach ($crosswalkStart in @(15, 46)) {
  for ($x = $crosswalkStart; $x -lt ($crosswalkStart + 3); $x++) {
    for ($y = 10; $y -le 21; $y++) {
      Set-Tile $ground $x $y 38
    }
  }
}

Fill-Area $ground 28 4 8 5 8
for ($y = 5; $y -le 7; $y++) {
  for ($x = 29; $x -le 34; $x++) {
    Set-Tile $ground $x $y 36
  }
}

function Add-TopShop([int]$x, [int]$width, [int]$roofGid, [int]$awningGid, [int]$windowWallGid, [int]$labelGid) {
  Fill-Area $structures $x 2 $width 3 $roofGid
  Fill-Area $structures $x 5 $width 1 39
  Fill-Area $structures $x 6 $width 2 9
  Fill-Area $structures $x 8 $width 1 $awningGid
  Fill-Area $structures $x 9 $width 1 9
  for ($ix = $x + 1; $ix -lt ($x + $width - 1); $ix += 2) {
    Set-Tile $structures $ix 6 $windowWallGid
  }
  $doorX = $x + [math]::Floor($width / 2)
  Set-Tile $structures $doorX 9 11
  Set-Tile $decor ($x + [math]::Floor($width / 2) - 1) 5 $labelGid
}

Add-TopShop 3 10 12 14 10 29
Add-TopShop 15 10 13 16 10 32
Add-TopShop 39 10 40 15 10 30
Add-TopShop 51 10 12 14 10 31

function Add-MarketStall([int]$x, [int]$y, [int]$roofGid) {
  Set-Tile $decor $x $y $roofGid
  Set-Tile $decor ($x + 1) $y $roofGid
  Set-Tile $decor $x ($y + 1) 25
  Set-Tile $decor ($x + 1) ($y + 1) 25
}

foreach ($stall in @(
  @{ X = 20; Y = 24; Roof = 23 },
  @{ X = 24; Y = 24; Roof = 24 },
  @{ X = 28; Y = 24; Roof = 23 },
  @{ X = 32; Y = 24; Roof = 24 },
  @{ X = 36; Y = 24; Roof = 23 }
)) {
  Add-MarketStall $stall.X $stall.Y $stall.Roof
}

Fill-Area $ground 18 23 22 5 8
for ($x = 19; $x -lt 40; $x += 3) {
  Set-Tile $decor $x 28 19
}

foreach ($tree in @(
  @{ X = 6; Y = 8 },
  @{ X = 10; Y = 8 },
  @{ X = 56; Y = 8 },
  @{ X = 59; Y = 8 },
  @{ X = 7; Y = 23 },
  @{ X = 56; Y = 23 }
)) {
  Set-Tile $decor $tree.X $tree.Y 17
}

foreach ($planter in @(
  @{ X = 12; Y = 10 },
  @{ X = 26; Y = 10 },
  @{ X = 37; Y = 10 },
  @{ X = 50; Y = 10 },
  @{ X = 14; Y = 21 },
  @{ X = 48; Y = 21 }
)) {
  Set-Tile $decor $planter.X $planter.Y 18
}

foreach ($lampX in @(4, 12, 20, 28, 36, 44, 52, 60)) {
  Set-Tile $decor $lampX 10 20
  Set-Tile $decor $lampX 21 20
}

Set-Tile $decor 31 5 22
Set-Tile $decor 32 5 22
Set-Tile $decor 31 6 22
Set-Tile $decor 32 6 21

foreach ($hedgeX in 27..36) {
  Set-Tile $decor $hedgeX 3 26
}

foreach ($flower in @(
  @{ X = 26; Y = 7 },
  @{ X = 37; Y = 7 },
  @{ X = 22; Y = 28 },
  @{ X = 34; Y = 28 },
  @{ X = 42; Y = 22 }
)) {
  Set-Tile $decor $flower.X $flower.Y 27
}

$shopSigns = @(
  @{
    height = 32
    id = 1
    name = 'Cafe Ember'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 160
    x = 112
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#ef476f' },
      @{ name = 'size'; type = 'int'; value = 22 }
    )
  },
  @{
    height = 32
    id = 2
    name = 'Vinyl Corner'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 176
    x = 496
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#06d6a0' },
      @{ name = 'size'; type = 'int'; value = 22 }
    )
  },
  @{
    height = 32
    id = 3
    name = 'Book Nook'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 160
    x = 1264
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#6c8fd9' },
      @{ name = 'size'; type = 'int'; value = 22 }
    )
  },
  @{
    height = 32
    id = 4
    name = 'Arcade Neon'
    rotation = 0
    type = 'shop'
    visible = $true
    width = 180
    x = 1658
    y = 72
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#f5b64a' },
      @{ name = 'size'; type = 'int'; value = 22 }
    )
  },
  @{
    height = 32
    id = 5
    name = 'Night Market'
    rotation = 0
    type = 'district'
    visible = $true
    width = 220
    x = 846
    y = 842
    properties = @(
      @{ name = 'color'; type = 'color'; value = '#fff3c9' },
      @{ name = 'size'; type = 'int'; value = 24 }
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
  nextobjectid = 6
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

$json = $map | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($mapPath, $json, [System.Text.Encoding]::UTF8)

Write-Output "Generated $tilesetPath"
Write-Output "Generated $mapPath"
