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
