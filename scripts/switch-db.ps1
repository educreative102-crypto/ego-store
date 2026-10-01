#!/usr/bin/env pwsh
# تحويل قاعدة البيانات بين SQLite (تطوير محلي) و Postgresql (نشر Supabase/Neon)
# الاستخدام:
#   .\scripts\switch-db.ps1 -Target postgres   # قبل النشر (يُبدّل السكيمة و يستدعي db push)
#   .\scripts\switch-db.ps1 -Target sqlite     # للعودة للتطوير المحلي
#
# ملاحظة: لا يلمس .env — يجب ضبط DATABASE_URL يدويًا قبل التشغيل:
#   - postgres: رابط Supabase عبر Transaction Pooler (?pgbouncer=true&connection_limit=1)
#   - sqlite  : file:./dev.db

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("postgres", "sqlite")]
  [string]$Target
)

$ErrorActionPreference = "Stop"
$schema = Join-Path $PSScriptRoot "..\prisma\schema.prisma"

function Ensure-NoBom($path, $text) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
}

$content = Get-Content -Raw -Path $schema
if ($Target -eq "postgres") {
  $next = $content -replace 'provider = "sqlite"', 'provider = "postgresql"'
  if ($next -eq $content) { Write-Error "السكيمة ليست sqlite — راجعها يدويًا" }
  Ensure-NoBom $schema $next
  Write-Host "[OK] schema.prisma -> postgresql"
  Write-Host "الآن نفّذ بالترتيب (مع DATABASE_URL = رابط Supabase):"
  Write-Host "  npx prisma db push"
  Write-Host "  npx prisma generate"
} else {
  $next = $content -replace 'provider = "postgresql"', 'provider = "sqlite"'
  if ($next -eq $content) { Write-Error "السكيمة ليست postgresql — راجعها يدويًا" }
  Ensure-NoBom $schema $next
  Write-Host "[OK] schema.prisma -> sqlite"
  Write-Host "تأكّد أن DATABASE_URL = file:./dev.db ثم نفّذ npx prisma generate"
}