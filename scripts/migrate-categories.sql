-- ترحيل الفئات من enum مثبّت في الكود إلى جدول "ProductCategory" يديره الأدمن.
-- يُنفَّذ مرة واحدة بعد `db push` الانتقالي (categoryId nullable وقائمة enum القديمة باقية)،
-- وقبل إزالة الحقل القديم وجعل categoryId إلزاميًا.

INSERT INTO "ProductCategory" ("id", "name", "slug", "sortOrder", "createdAt") VALUES
  ('cat_hoodie', 'هودي', 'hoodie', 10, now()),
  ('cat_tshirt', 'تيشيرت', 'tshirt', 20, now())
ON CONFLICT ("slug") DO NOTHING;

-- القيم القديمة في enum هي HOODIE/TSHIRT، والـ slug المطابق لها hoodie/tshirt.
UPDATE "Product" p
SET "categoryId" = c."id"
FROM "ProductCategory" c
WHERE p."categoryId" IS NULL
  AND c."slug" = lower(p."category"::text);

-- حارس أمان: لا نكمل إلى حذف العمود القديم إن بقي منتج بلا فئة.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Product" WHERE "categoryId" IS NULL) THEN
    RAISE EXCEPTION 'يوجد منتجات بلا فئة — أوقف الترحيل قبل حذف العمود القديم';
  END IF;
END $$;
