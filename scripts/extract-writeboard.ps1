$ErrorActionPreference = 'Stop'

$src  = 'C:\Users\farak\Downloads\Farnoosh_Micro_Lesson_Presenter_2026-08-26 (1).html'
$dest = Join-Path (Get-Location) 'utils/html/writeboard.ts'

$lines = [System.IO.File]::ReadAllLines($src, [System.Text.Encoding]::UTF8)
Write-Output ("Source lines: " + $lines.Count)

function Get-RangeLines([int]$from, [int]$to) {
  $parts = New-Object System.Collections.Generic.List[string]
  for ($i = $from; $i -le $to; $i++) { $parts.Add($lines[$i - 1]) }
  return [string]::Join("`r`n", $parts.ToArray())
}

# CSS: #whiteboard-overlay styles block (7937 .. 8235, right before </style>)
$css  = Get-RangeLines 7937 8235
# HTML: <div id="whiteboard-overlay"> through the final closing </div> of its modals (12855 .. 13131)
$html = Get-RangeLines 12855 13131
# JS: the complete Writeboard IIFE (40416 .. 41191)
$js   = Get-RangeLines 40416 41191

Write-Output ("CSS  chars: " + $css.Length)
Write-Output ("HTML chars: " + $html.Length)
Write-Output ("JS   chars: " + $js.Length)

# Sanity assertions on boundaries
if (-not $css.StartsWith('#whiteboard-overlay{'))  { throw 'CSS range is wrong' }
if (-not $html.TrimStart().StartsWith('<div id="whiteboard-overlay"')) { throw 'HTML range is wrong' }
if (-not $js.Contains('(function(){')) { throw 'JS range is wrong' }
if (-not $js.TrimEnd().EndsWith('})(); })();')) { throw 'JS range does not end at the IIFE close' }

# Make learner name / course dynamic instead of the reference hardcode
$jsOld = 'var LN="Farnoosh",CN="English for Academic Purposes & TOEFL Preparation";'
$jsNew = 'var LN=(window.LEARNER_NAME||window.__LEARNER_NAME||"Student"),CN=(window.LESSON_COURSE_NAME||"");'
if (-not $js.Contains($jsOld)) { throw 'LN/CN line not found in JS chunk' }
$js = $js.Replace($jsOld, $jsNew)

$html = $html.Replace('Student: Farnoosh', 'Student Name')
$html = $html.Replace('Course: English for Academic Purposes & TOEFL Preparation', 'Course Name')

# Escape for embedding inside a TypeScript template literal
function Esc([string]$s) {
  $s = $s.Replace('\', '\\')
  $s = $s.Replace('`', '\`')
  $s = $s.Replace('${', '\${')
  return $s
}

$cssE  = Esc $css
$htmlE = Esc $html
$jsE   = Esc $js

$nl = "`r`n"
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append('// VERBATIM PORT of the full Smart Writeboard from the reference lesson.')
[void]$sb.Append($nl)
[void]$sb.Append('// Includes: rich-text toolbar, Mark Error menu, find/replace, text box, link, image,')
[void]$sb.Append($nl)
[void]$sb.Append('// file import (PDF/DOCX/PPTX), tables, templates, banners, pages panel, drawing tools,')
[void]$sb.Append($nl)
[void]$sb.Append('// page setup, themes, AI prompt library, writing assessor, thesaurus, context menu,')
[void]$sb.Append($nl)
[void]$sb.Append('// live mic transcription, save (PDF/Word/HTML/Text), print view, autosave + restore.')
[void]$sb.Append($nl)
[void]$sb.Append('export const getWriteboardFeatures = () => {')
[void]$sb.Append($nl)
[void]$sb.Append('  const css = `' + $nl + $cssE + $nl + '  `;')
[void]$sb.Append($nl)
[void]$sb.Append('  const html = `' + $nl + $htmlE + $nl + '  `;')
[void]$sb.Append($nl)
[void]$sb.Append('  const js = `' + $nl + $jsE + $nl + '  `;')
[void]$sb.Append($nl)
[void]$sb.Append('  return { html, css, js };')
[void]$sb.Append($nl)
[void]$sb.Append('};')
[void]$sb.Append($nl)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($dest, $sb.ToString(), $utf8NoBom)
Write-Output ("Wrote: " + $dest + " (" + (Get-Item $dest).Length + " bytes)")
