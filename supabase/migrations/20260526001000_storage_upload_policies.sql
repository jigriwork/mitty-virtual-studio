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
