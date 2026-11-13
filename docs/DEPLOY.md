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
     postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&statement_cache_size=0&connect_timeout=30
     ```
   - > انتبه للفروق الحاسمة: المستخدم `postgres.PROJECT_REF` (وليس `postgres`)، والعنوان `...pooler.supabase.com:6543`.
   - **`connect_timeout=30` ليس اختياريًا عمليًا:** مصافحة Supavisor من بعض الشبكات تستغرق 5–7 ثوانٍ، ومهلة Prisma الافتراضية 5 ثوانٍ فقط، فيظهر `Can't reach database server ...:6543` (P1001) رغم أن المنفذ مفتوح والقاعدة تعمل. رفع المهلة يلغي هذا الفشل المتقطّع.
   - **`statement_cache_size=0`:** يمنع `prepared statement "s0" already exists` عند المرور عبر Transaction pooler (وضع `pgbouncer`).
   - **قيمة `connection_limit`:** نستخدم **`5`** وليس `1`. `1` يسبب `P2024 (Timed out fetching a new connection)` عند أي تزامن (الصفحة تستدعي إعدادات من عدة مكوّنات + 3 كتالوجات متوازية). `5` آمنة لمتجرنا ولا تُرهق خطة Free.
   - أنشئ رابطًا ثانيًا من **Session pooler**: نفس المضيف والمستخدم وكلمة المرور، لكن المنفذ `5432` وبدون `pgbouncer`:
     ```
     postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
     ```
     هذا الرابط يُحفظ في `DIRECT_URL` وتستخدمه أوامر المخطط (`db push` / `migrate` / `db execute`). السبب: وضع Transaction Pooler لا يدعم Prepared Statements، فتظهر `prepared statement "s0" already exists` مع أوامر Prisma CLI.
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
   alter table public."RateBucket"       disable row level security;
  ```
  (الأسماء بعلامات تنصيص مزدوجة لأن Prisma يولّدها هكذا. إن لم توجد الجداول بعد: أنشئها أولًا بـ `db push` ثم نفّذ هذا السكربت — أو نفّذه بـ `npx prisma db execute` كما في الخطوة 3/4.)
- ⚠️ **عند إضافة أي جدول جديد** (مثل `RateBucket`) نفّذ نفس الأمر له، وإلا أَجاب Postgres بـ `P2010` عند أول استدعاء لتحديد المعدّل. الملف الجاهز `scripts/disable-rls.sql` محدّث بكل الجداول.
- البديل الأنظف: وعوضًا عن تعطيل RLS، اربط بـ **جدول بحساب الخدمة/المالك** مباشرة عبر Transaction pooler — Prisma تتصل كمالك الجدول، وRLS لا تُطبَّق على المالك في Supabase بوضع `FORCE ROW LEVEL SECURITY` غير المعمّل. احتفظ بهذا كخطة سقوط.

## 2) المتغيّرات المحلية (مرة واحدة)
1. في `.env` المحلي ضع الرابطين من الخطوة 1:
   ```
   DATABASE_URL="postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&statement_cache_size=0&connect_timeout=30"
   DIRECT_URL="postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?connect_timeout=30"
   ```
   إن كان Session pooler (`5432`) معطّلًا على مشروعك (يفتح TCP ثم لا تُكمل المصافحة)، اجعل `DIRECT_URL` نفس رابط `6543` **مع** `statement_cache_size=0` — تعمل أوامر المخطط عبر Transaction pooler عندها.
   `prisma/schema.prisma` يحتوي أصلًا `url = env("DATABASE_URL")` و`directUrl = env("DIRECT_URL")`، فلا تعدّل المخطط.
2. ادفع قاعدة البيانات وأنشئ العميل:
   ```powershell
   npx prisma db push
   npx prisma generate
   ```
   `db push` يمرّ تلقائيًا عبر `DIRECT_URL` (Session pooler)، فلا يصطدم بقيود Prepared Statements.
3. نفّذ سكربت RLS (تعطيل RLS للجداول السبعة) — الملف الجاهز `scripts/disable-rls.sql`:
   ```powershell
   npx prisma db execute --file scripts\disable-rls.sql --schema prisma\schema.prisma
   ```
   (أو الصقه في Supabase SQL Editor ثم Run.)

## 3) التطوير المحلي
التطوير الآن مباشرة على قاعدة Supabase نفسها عبر الرابطين أعلاه — لا يوجد تبديل إلى SQLite ولا سكربت `switch-db.ps1` (حُذف لأن المخطط صار PostgreSQL دائمًا مع `directUrl`).
- `npm run dev` يقرأ `DATABASE_URL` (Transaction pooler).
- أي أمر مخطط (`db push`/`db execute`) يقرأ `DIRECT_URL` تلقائيًا.
- إن أردت بيئة معزولة محليًا: ثبّت PostgreSQL محليًا وضع رابطيه في `.env` بنفس الأسماء.

## 4) الرفع إلى GitHub ثم Vercel
1. أنشئ مستودعًا خاصًا في https://github.com/new (اختياري: عام ثم اجعله خاصًا لاحقًا).
2. اربط وادفع:
   ```powershell
   git remote add origin https://github.com/<YOU>/ego-store.git
   git push -u origin main
   ```
3. في https://vercel.com: **Add New → Project** ← استورد المستودع.

## 5) المتغيّرات في Vercel
| المتغير | القيمة | ملاحظة |
|---|---|---|
| `DATABASE_URL` | رابط Supabase **Transaction pooler** (منفذ `6543`) مع `?pgbouncer=true&connection_limit=5&statement_cache_size=0&connect_timeout=30` | **إلزامي** — منه تُقرأ كل بيانات المتجر. بدون `connect_timeout=30` تظهر `P1001` متقطعة عند بطء مصافحة Supavisor |
| `DIRECT_URL` | رابط Supabase **Session pooler** (منفذ `5432`) أو رابط `6543` نفسه مع `statement_cache_size=0` إن كان Session pooler معطّلًا | يُستخدم لأوامر المخطط فقط (`db push`/`migrate`/`db execute`). غير مطلوب وقت تشغيل التطبيق |
| `AUTH_SECRET` | سلسلة عشوائية 32+ حرفًا (ثابتة؛ تغييرها يطرد الجلسات) | **إلزامي** — بدونه يرمي `auth.ts` استثناءً ويفشل تسجيل الدخول كليًا. وغيابه يُبقي `/api/sheets/sync` مغلقًا (لا يقبل `Bearer` فارغًا) |
| `GOOGLE_SA_JSON` | كامل JSON الخاص بـ Service Account في **سطر واحد** | **اختياري** — يُلزم فقط إن أردت مزامنة Google Sheets. لا يُخزَّن في قاعدة البيانات ولا يُرسل للمتصفح. راجع «ترحيل المفتاح» أدناه |
| `APP_URL` | `https://<your-subdomain>.vercel.app` (أو نطاقك النهائي) | يُستخدم في `sitemap.xml` و`robots.txt` فقط |
| `ADMIN_PASSWORD` | كلمة مرور لوحة الأدمين | **اختياري** — تُزرع مرة واحدة فقط إن كان `adminPasswordHash` فارغًا؛ بعدها غيّرها من `/admin/settings` |

> **لا تضف `DATABASE_URL_UNPOOLED`** — الكود لا يقرأه إطلاقًا. البديل المدعوم رسميًا من Prisma هو `DIRECT_URL` (موجود في `schema.prisma`).

**من أين تجيب كلمة مرور القاعدة:** Project Settings ← Database ← Database password (زر إظهار/نسخ)، أو **Reset database password** إن نسيتها — ولا يمسّ البيانات. ⚠️ لا تكتب النص الحرفي `[YOUR-PASSWORD]`، ولا تنسخ كلمة المرور من `.env` المحلي (قد تكون قديمة).

⚠️ **تعديل المتغيّرات لا يسري فورًا** — يجب `Redeploy` بعد كل حفظ.

ثم **Deploy**. بعد أول نجاح افتح `/admin/login` ودخل الإعدادات لربط الواتساب/شام كاش/Google Sheets.

## 6) المجال المخصص (اختياري)
Vercel ← **Settings ← Domains** ← أضف نطاقك ووثّق DNS وحدّث `APP_URL`.

## 7) مزامنة Google Sheets (اختيارية — تعمل بدونها)
1. أنشئ Spreadsheet في Google واسمه مثل `EGO`.
2. من Google Cloud Console أنشئ **Service Account** وحمّل مفتاح JSON.
3. Vercel ← **Settings ← Environment Variables** ← أضف `GOOGLE_SA_JSON` بالقيمة الكاملة (سطر واحد، الـ JSON كما هو بلا أسطر جديدة).
4. لوحة التحكم: `/admin/settings` ← ضع **معرّف الجدول فقط**. حقل مفتاح الخدمة لم يعد موجودًا هناك.
5. شارك الجدول مع بريد الـ Service Account (سماح محرر).
6. زر "زامن الآن" في `/admin/reports`. دون ربط، المزامنة تتوقف بصمت ويظل المتجر يعمل.

### ترحيل المفتاح من قاعدة البيانات (لمتجر مُشغَّل قبل هذا التحديث)
الكود يقرأ `GOOGLE_SA_JSON` أولًا، ويسقط إلى الصف القديم `googleServiceAccountJson` في جدول `Setting` كترحيل مؤقت (مع تحذير في logs). الخطوات:
1. **قبل النشر**: افتح `/admin/settings` على النسخة الحالية وانسخ نص الـ JSON كاملًا (الحقل ما زال موجودًا هناك).
2. أضفه كمتغير `GOOGLE_SA_JSON` ← **Redeploy**.
3. تأكد في `/admin/reports` أن الحالة «متصل» وأن «زامن الآن» ينجح.
4. **الآن** احذف السرّ نهائيًا:
   ```sql
   delete from "Setting" where key = 'googleServiceAccountJson';
   ```
5. بعد أسبوع، احذف مسار الترحيل (الدالة `serviceAccountJson`) من `src/lib/sheets/client.ts` ليصبح `GOOGLE_SA_JSON` إلزاميًا.

> **لماذا؟** المفتاح كان يُخزَّن في `AppSettings` الذي يُمرَّر إلى مكوّنات العميل فيُسلسَل في HTML كل صفحة منتج لكل زائر — تسريب كامل للمفتاح الخاص. إخراجه من `AppSettings` يجعل التسريب مستحيلًا بنيويًا. الاختبار `src/lib/__tests__/settings-secrets.test.ts` يحرس ذلك ضد أي انحدار.

## 8) المراقبة ومزامنة يومية (اختيارية — بلا cron داخل المستودع)
حُذف `vercel.json` كليًا: كان يحتوي cron يطلب `/api/health` كل 5 دقائق بلا أي مستهلك، وخطة Hobby تسمح بيوميًا فقط، وهو سبب شائع لفشل البناء (`Cron job` غير مسموح).

- **مراقبة صعود/هبوط الموقع:** استخدم خدمة خارجية مثل **UptimeRobot** على `https://<نطاقك>/api/health` كل 5 دقائق — مجانية، وتنبيه بريد، ولا تمسّ Vercel.
- **مزامنة يومية للجداول:** لم تعد هناك حاجة — المزامنة تحدث عند كل عملية بيع/إلغاء (ومدمجة: عشر عمليات متتالية = كتابة واحدة)، وزر «زامن الآن» في `/admin/reports` يكفي. إن احتجتها يوميًا لاحقًا فأضف `vercel.json` بجدول `0 6 * * *` على `/api/sheets/sync` (المسار يفحص `Authorization: Bearer <AUTH_SECRET>` ويكتب فقط إن كان هناك تغيير غير مزامن).

### كيف تُكتب الجداول بلا فقد بيانات
`writeSheet` يرسل **نداء HTTP واحدًا** (`values.batchUpdate`) يحمل الكتابة الجديدة + مسح الذيل معًا، بدل `clear` ثم `update` في نداءين. السبب: في بيئة serverless كانت العملية تُقتل بين النداءين فيبقى التبويب **فارغًا**. الآن لا توجد نقطة انتظار بينهما؛ وأسوأ حالة ممكنة هي بقاء سطور قديمة تحت البيانات (عيب تجميلي).

المزامنة نفسها تُقفل بـ `Setting.SHEETS_SYNC_LOCK` (كاش مدته 60 ثانية) فلا تتداخل كتابتان، وتُرفع `SHEETS_PENDING_AT` علامةً على وجود تغيير. مسحُها بعد نجاح الكتابة **مشروط** بلقطة زمنية تُلتقط قبل القراءة، فلا تُمسح طلبات تغيّرت أثناء المزامنة. التنفيذ داخل `after()` من `next/server` — لا `void async` — فيضمن Next بقاء الدالة حيّة حتى ينتهي تنفيذها (كما ينصّ `PLAN.md`).

## 9) استكشاف الأعطال
| العَرَض | السبب | الحل |
|---|---|---|
| `Error occurred prerendering page "/sitemap.xml"` + `PrismaClientInitializationError` وقت البناء | خطأ في `DATABASE_URL`؛ كان `sitemap.ts` يُنفَّذ وقت البناء | ✅ **مُصلَح**: `sitemap.ts` صار `force-dynamic` بـ `try/catch` — البناء لا يلمس القاعدة. إن تكرر: صحّح `DATABASE_URL` |
| `git push` لا يُنتج deployment | Vercel **علّق النشر التلقائي** بعد محاولات بناء فاشلة متتالية | Deployments ← شريط `Automatic deployments are paused` ← **Resume deployments** |
| `git push` لا يُنتج deployment (ولا شريط إيقاف) | ربط Git أو صلاحية GitHub App | Settings ← Git ← المستودع `main` + **Disable Automatic Deployments** OFF + GitHub ← Settings ← Applications ← Vercel ← المستودع مُدرج |
| `Authentication failed against database server` | كلمة مرور القاعدة خاطئة أوPlaceholder | أعد خطوة 5 أعلاه |
| `Schema engine error: prepared statement "s0" already exists` | `db push`/`migrate` عبر Transaction pooler (6543) الذي لا يدعم Prepared Statements | أضف `DIRECT_URL` (Session pooler، منفذ `5432` بدون `pgbouncer`) وأعد تنفيذ الأمر — موجود في `schema.prisma` عبر `directUrl` |
| `P1001` متقطّع على منفذ `6543` رغم أن المنفذ مفتوح والقاعدة تعمل | مصافحة Supavisor تستغرق 5–7 ثوانٍ بينما مهلة Prisma الافتراضية 5 ثوانٍ | أضف `&connect_timeout=30` إلى `DATABASE_URL` — هذا هو الإصلاح الفعلي |
| `P1001` عابر على منفذ `5432` | Supavisor يغلق اتصالات خاملة أو أن Session pooler معطّل | أعد الأمر مرة واحدة؛ إن تكرر استخدم رابط `6543` مع `statement_cache_size=0` في `DIRECT_URL` |
| `P1001` مستمر على `5432` بينما التطبيق يعمل على `6543` | Session pooler غير متاح مؤقتًا | استخدم مؤقتًا `DIRECT_URL` = نفس رابط `DATABASE_URL` (6543) **بشرط** إضافة `&statement_cache_size=0`؛ عندها تعمل أوامر المخطط عبر Transaction pooler |
| التقارير تعرض «تكاليف القطع غير متاحة» | العمود `OrderItem.unitCost` ناقص في القاعدة | `npx prisma db push` على قاعدة الإنتاج |
| `P2024` (انتهت مهلة الاتصال) | `connection_limit` منخفض أو مفقود | تأكد من `?pgbouncer=true&connection_limit=5&connect_timeout=30` |
| `P2010` | RLS ما زالت مفعّلة | ارجع لخطوة 2.4 |
| إعادة النشر تُبني كوميت قديم | زر Redeploy على deployment قديمة يعيد بناءها | على Hobby التراجع غير متاح — انشر بـ `npx vercel --prod` (يبني آخر كوميت على جهازك) |
| `403` عند `git push` بعد تبديل المستودع | بيانات اعتماد الحساب القديم مخزّنة | استخدم مفتاح SSH، أو امسح entry القديم من Windows Credential Manager |

> **المبدأ دائمًا:** افصل بين البناء والتشغيل — أي صفحة تحتاج بيانات يجب أن تحمل `export const dynamic = "force-dynamic"`. صفحة تُنفَّذ وقت البناء تصبح نقطة فشل تُسقط الموقع كاملًا.

## تحذيرات النشر الحاسمة
- **لا تُرفع أي أسرار** (`.env` مستثنى بالمستودع) — كلها تُدخل في Vercel.
- **البناء يجب ألّا يحتاج القاعدة إطلاقًا** — أي ملف static يقرأ Prisma ويسقط البناء كله عند أي انقطاع. راجع فقرة 9.
- `DATABASE_URL` على Vercel **يجب** أن يكون عبر Transaction pooler — ولا تنسَ `pgbouncer=true` و`connection_limit=5` و`connect_timeout=30` (انظر `P2024`/`P1001` أعلاه).
- `DIRECT_URL` يجب أن يكون عبر Session pooler (أو Direct connection) — لا تضع عليه `pgbouncer=true` أبدًا.
- بعد أول نشر، غيّر عناصر الإعدادات الافتراضية من `/admin/settings`.
- إذا واجهتك `P1001`/`too many connections`: تأكد أنك على منفذ `6543` وأن الـ `connection_limit` مناسب (لا ترفعه فوق حد خطة Free المجاني بعنف؛ `5` تكفينا).
- إن ظهرت `P2010` وقت النشر تعني أن RLS ما زالت مفعّلة — ارجع للخطوة 2.4 (تعلوية الجداول).
- **نقل المشروع إلى حساب آخر** (GitHub أو Vercel): اعمل `git remote set-url origin <new>` ثم `git push -u origin main` (ينقل التاريخ كاملًا)، ثم في Vercel **Add New → Project** ← استورد المستودع الجديد ← أضف المتغيّرات ← Redeploy. **لا تحذف المشروع القديم قبل أن يعمل الجديد ٤٨ ساعة.**
