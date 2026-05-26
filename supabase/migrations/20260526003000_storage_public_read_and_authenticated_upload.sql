insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-generated-images',
    'product-generated-images',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  ),
  (
    'size-charts',
    'size-charts',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product generated images" on storage.objects;
create policy "Public can read product generated images"
on storage.objects
for select
to public
using (bucket_id = 'product-generated-images');

drop policy if exists "Authenticated users can read product generated images" on storage.objects;
create policy "Authenticated users can read product generated images"
on storage.objects
for select
to authenticated
using (bucket_id = 'product-generated-images');

drop policy if exists "Authenticated users can upload product generated images" on storage.objects;
create policy "Authenticated users can upload product generated images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-generated-images');

drop policy if exists "Authenticated users can update product generated images" on storage.objects;
create policy "Authenticated users can update product generated images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-generated-images')
with check (bucket_id = 'product-generated-images');

drop policy if exists "Public can read size charts" on storage.objects;
create policy "Public can read size charts"
on storage.objects
for select
to public
using (bucket_id = 'size-charts');

drop policy if exists "Authenticated users can read size charts" on storage.objects;
create policy "Authenticated users can read size charts"
on storage.objects
for select
to authenticated
using (bucket_id = 'size-charts');

drop policy if exists "Authenticated users can upload size charts" on storage.objects;
create policy "Authenticated users can upload size charts"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'size-charts');

drop policy if exists "Authenticated users can update size charts" on storage.objects;
create policy "Authenticated users can update size charts"
on storage.objects
for update
to authenticated
using (bucket_id = 'size-charts')
with check (bucket_id = 'size-charts');
