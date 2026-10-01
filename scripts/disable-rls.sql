-- الصق هذا النص كاملًا في Supabase → SQL Editor ثم اضغط Run
-- يُنفَّذ بعد تنفيذ prisma db push (توجد الجداول إذن)
-- يفعّل Prisma كل قراءة/كتابة عبر تجاوز حماية RLS (مطلوب مع اتصال Supabase)

alter table public."Product" disable row level security;
alter table public."Variant" disable row level security;
alter table public."Order" disable row level security;
alter table public."OrderItem" disable row level security;
alter table public."Invoice" disable row level security;
alter table public."Setting" disable row level security;