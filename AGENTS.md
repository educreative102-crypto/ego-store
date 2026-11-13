# AGENTS.md — تعليمات العمل على متجر EGO

اقرأ `docs/PLAN.md` أولًا. هذا الملف يحدد بيئة العمل والأوامر والتزامات الصيانة.

## البيئة
- OS: Windows / PowerShell 5.1 (لا يدعم `&&` — استخدم `;` أو `if ($?) { }`)
- Node 24 + npm 11
- Next.js App Router + TypeScript + Tailwind
- ORM: Prisma — المخطط `postgresql` للجميع الآن؛ الإنتاج على Supabase (راجع `docs/DEPLOY.md`). `.env` المحلي يحتاج `DATABASE_URL` صالحًا.

## الأوامر
- تثبيت: `npm install`
- تشغيل محلي: `npm run dev`
- فحص البناء (واجب قبل الـ commits): `npm run build`
- اختبارات منطق العمل: `npm test`
- مزامنة قاعدة البيانات بعد تغيير schema: `npx prisma db push`
- توليد العميل: `npx prisma generate`

## ذكر القذيفة
- القيم في `.env` تُقرأ فقط لوضعها هناك؛ لا تُروّي قيم إنتاج في الكود ولا تُرفع أسرار.

## ملاحظات البنية (المواقع الرئيسية)
- `src/lib/inventory.ts` — كل قوانين الجرد (دوال نقية). أي تغيير جردي يمر منها.
- `src/lib/settings.ts` — قراءة/تحديث إعدادات المتجر (من DB).
- `src/lib/whatsapp.ts` — بناء رسائل wa.me (الرمز، القطعة، المقاس، اللون، الكمية، الطباعة، السعر).
- `src/lib/order-keys.ts` — توليد الأرقام التسلسلية (SKU/ORD/INV).
- `src/lib/categories.ts` — قراءة فئات المنتجات (جدول `ProductCategory` يديره الأدمن) وعدّ منتجاتها.
- `src/lib/category-slug.ts` — اشتقاق رابط الفئة من الاسم العربي + حلّ التكرار (دوال نقية).
- `src/lib/sheets/` — مزامنة Google Sheets (تتوقف بصمت دون ربط).
- `src/app/admin/**` — لوحة التحكم (محمية؛ أي صفحة جديدة تضاف يجب أن تُضاف داخل هيكل admin).
- التسجيل: خادمي عبر Server Actions + Cookie موقع بتوقيع HMAC.

## التزامات العمل
- الواجهة RTL عربية بخط Cairo.
- الرسائل والأنساق العربية أولوية (الأرانب بالجمع العربي ألا يكون نصًا إنجليزيًا فجًا).
- لا comment زخرفية في الكود؛ الأسماء تعبّر.
- أي ميزة جديدة تؤثر على الجرد/المبيعات/الأرباح يجب أن تحدّث تبويبات شيتس الأربعة.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
