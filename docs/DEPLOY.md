# دليل النشر السحابي — متجر EGO (Vercel + Supabase)

> الخيار الوحيد المعتمد: **Supabase** (PostgreSQL) + **Vercel**. لا نستخدم Neon أبدًا.
> المسار الكامل مبني على Prisma، لذا كل ما تفعله هنا يعمل مع أي مزوّد PostgreSQL آخر إن تغيّر رأيك يومًا — دون تعديل أي كود.

## 0) أثنان من "أقرب منطقة لسوريا"
عند إنشاء مشروع Supabase اختر المنطقة **فرانكفورت** (`eu-central-1` — أقرب وأفضلها توازنًا للشرق الأوسط؛ لا توجد منطقة أوسطية لدى Supabase حاليًا).
بدائل مقبولة بترتيب القرب: بولندا `eu-central-2`، ثم لندن `eu-west-2`. **تجنّب** أمريكا/سنغافورة (بطء أعلى لزائرهم).

## 1) قاعدة البيانات: Supabase
1. أنشئ حسابًا في https://supabase.com (سجّل بـ GitHub أو بريدك).
2. اضغط **New project**:
   - الاسم: `ego-store`
   - **كلمة مرور قاعدة البيانات**: احفظها جيدًا (يُطلب لاسترجاع رابط الاتصال) — أو اختر المتولّدة.
   - **Region**: `Central EU (Frankfurt)`.
   - خطة **Free** (منطقة فرانكفورت متاحة مجانًا).
3. في صفحة المشروع اضغط زر **Connect** أعلى الصفحة (وليس Settings): 
   - اختر **Transaction pooler** (منفذ `6543` عبر Supavisor — إلزامي مع Prisma serverless لتفادي `too_many_connections`).
   - انسخ رابطًا بصيغة (استبدل `[YOUR-PASSWORD]` بكلمة مرور القاعدة):
     ```
     postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5
     ```
   - > انتبه للفروق الحاسمة: المستخدم `postgres.PROJECT_REF` (وليس `postgres`)، والعنوان `...pooler.supabase.com:6543`.
   - **قيمة `connection_limit`:** نستخدم **`5`** وليس `1`. `1` يسبب `P2024 (Timed out fetching a new connection)` عند أي تزامن (الصفحة تستدعي إعدادات من عدة مكوّنات + 3 كتالوجات متوازية). `5` آمنة لمتجرنا ولا تُرهق خطة Free.
   - > فعلنا أيضًا داخل التطبيق: `getSettings` مكشوفة بـ React `cache()` ليُدمج الاستدعاءات المتوازية في نفس العرض.

### 🚨 RLS (الأهم في Supabase)
Supabase تفعّل **Row Level Security** تلقائيًا على جداول `public` — وهذا **يحظر على Prisma كل قراءة/كتابة** حتى تحتفظ بصلاحياتيفعل. أنت لا تملك الجداول عبر `prisma db push`، لذا:
- **الخيار الموصى به (الأبسط والأضمن):** قبل الاستعلام عن الجداول في التطبيق، نفّذ داخل SQL Editor في Supabase:
  ```sql
  alter table public."Product"          disable row level security;
  alter table public."Variant"          disable row level security;
  alter table public."Order"            disable row level security;
  alter table public."OrderItem"        disable row level security;
  alter table public."Invoice"          disable row level security;
  alter table public."Setting"          disable row level security;
  ```
  (الأسماء بعلامات تنصيص مزدوجة لأن Prisma يولّدها هكذا. إن لم توجد الجداول بعد: أنشئها أولًا بـ `db push` ثم نفّذ هذا السكربت — أو نفّذه بـ `npx prisma db execute` كما في الخطوة 3/4.)
- البديل الأنظف: وعوضًا عن تعطيل RLS، اربط بـ **جدول بحساب الخدمة/المالك** مباشرة عبر Transaction pooler — Prisma تتصل كمالك الجدول، وRLS لا تُطبَّق على المالك في Supabase بوضع `FORCE ROW LEVEL SECURITY` غير المعمّل. احتفظ بهذا كخطة سقوط.

## 2) تحويل المشروع إلى PostgreSQL (مرة واحدة قبل النشر)
1. شغّل السكربت الجاهز (يبدّل `prisma/schema.prisma` من sqlite إلى postgresql):
   ```powershell
   .\scripts\switch-db.ps1 -Target postgres
   ```
2. عُدّل المتغيّر في `.env` محليًا (رابط Supabase من الخطوة 1):
   ```
   DATABASE_URL="postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
   ```
3. ادفع قاعدة البيانات وأنشئ العميل:
   ```powershell
   npx prisma db push
   npx prisma generate
   ```
4. نفّذ سكربت RLS (تعطيل RLS للجداول الستة) — الملف الجاهز `scripts/disable-rls.sql`:
   ```powershell
   npx prisma db execute --file scripts\disable-rls.sql --schema prisma\schema.prisma
   ```
   (أو الصقه في Supabase SQL Editor ثم Run.)

## 3) الاطلاع/التطوير المحلي بعد التحويل
السكربت يُعيدك لـ SQLite بنقرة:
```powershell
.\scripts\switch-db.ps1 -Target sqlite
```
(ثم اجعل `DATABASE_URL="file:./dev.db"` محليًا). التطوير اليومي يبقى على SQLite السريعة؛ والنشر فقط على Supabase.

## 4) الرفع إلى GitHub ثم Vercel
1. أنشئ مستودعًا خاصًا في https://github.com/new (اختياري: عام ثم اجعله خاصًا لاحقًا).
2. اربط وادفع:
   ```powershell
   git remote add origin https://github.com/<YOU>/ego-store.git
   git push -u origin main
   ```
3. في https://vercel.com: **Add New → Project** ← استورد المستودع.

## 5) المتغيّرات في Vercel
| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Supabase **Transaction pooler** من الخطوة 1 (بـ `pgbouncer=true&connection_limit=5`) |
| `DATABASE_URL_UNPOOLED` | (يفضَّل) رابط Direct/Session pooler `:5432` بدون `?pgbouncer` — سيتصل Prisma بها لعمليات DDL لو احتجنا |
| `ADMIN_PASSWORD` | كلمة مرور لوحة الأدمين |
| `AUTH_SECRET` | سلسلة عشوائية 32+ حرفًا (ثابتة؛ تغييرها يطرد الجلسات) |
| `APP_URL` | `https://<your-subdomain>.vercel.app` (أو نطاقك النهائي) |

ثم **Deploy**. بعد أول نجاح افتح `/admin/login` ودخل الإعدادات لربط الواتساب/شام كاش/Google Sheets.

## 6) المجال المخصص (اختياري)
Vercel ← **Settings ← Domains** ← أضف نطاقك ووثّق DNS وحدّث `APP_URL`.

## 7) مزامنة Google Sheets (اختيارية — تعمل بدونها)
1. أنشئ Spreadsheet في Google واسمها مثل `EGO`.
2. من Google Cloud Console أنشئ **Service Account** وحمّل مفتاح JSON.
3. لوحة التحكم: `/admin/settings` ← الصق JSON الـ Service Account + معرّف الجدول.
4. شارك الجدول مع بريد الـ Service Account (سماح محرر).
5. زر "زامن الآن" في `/admin/reports`. دون ربط، المزامنة تتوقف بصمت ويظل المتجر يعمل.

## 8) مزامنة يومية تلقائية (اختفت خطوة — اختيارية)
`vercel.json` مع cron:
```json
{
  "crons": [
    { "path": "/api/sheets/sync", "schedule": "0 6 * * *" }
  ]
}
```
(خطة Pro فقط؛ وإلا استخدم cron-job.org وتأكد من فحص `Authorization: Bearer <AUTH_SECRET>` في نهاية المسار.)

## تحذيرات النشر الحاسمة
- **لا تُرفع أي أسرار** (`.env` مستثنى بالمستودع) — كلها تُدخل في Vercel.
- `DATABASE_URL` على Vercel **يجب** أن يكون عبر Transaction pooler — ولا تنسَ `pgbouncer=true` و `connection_limit=5` (وليس `1`؛ انظر سبب `P2024` أعلاه).
- بعد أول نشر، غيّر عناصر الإعدادات الافتراضية من `/admin/settings` (خصوصًا `ADMIN_PASSWORD` إن تُركت افتراضية).
- إذا واجهتك `P1001`/`too many connections`: تأكد أنك على منفذ `6543` وأن الـ `connection_limit` مناسب (لا ترفعه فوق حد خطة Free المجاني بعنف؛ `5` تكفينا).
- إن ظهرت `P2010` وقت النشر تعني أن RLS ما زالت مفعّلة — ارجع للخطوة 2.4 (تعلية الجداول).
