#!/usr/bin/env pwsh
# تحويل قاعدة البيانات بين SQLite (تطوير محلي) و Postgresql (نشر Supabase)
# الاستخدام:
#   .\scripts\switch-db.ps1 -Target postgres   # قبل النشر (يُبدّل السكيمة فقط)
#   .\scripts\switch-db.ps1 -Target sqlite     # للعودة للتطوير المحلي
#
# ملاحظة: لا يلمس .env ولا يشغّل db push — بعد تشغيله نفّذ يدويًا:
#   - postgres: npx prisma db push  ثم  npx prisma generate
#   - sqlite  : DATABASE_URL = file:./dev.db  ثم  npx prisma generate
#
# تذكير: رابط Supabase يجب أن يكون عبر Transaction Pooler مع
#   ?pgbouncer=true&connection_limit=5   (connection_limit=1 يسبب خطأ P2024)

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