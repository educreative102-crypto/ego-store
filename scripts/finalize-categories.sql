-- الخطوة الأخيرة من ترحيل الفئات: تثبيت categoryId وحذف العمود القديم ونوع enum.
-- تُنفَّذ بعد scripts/migrate-categories.sql وبعد التأكد أن كل منتج له فئة.

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN IF EXISTS "category";
DROP TYPE IF EXISTS "Category";
