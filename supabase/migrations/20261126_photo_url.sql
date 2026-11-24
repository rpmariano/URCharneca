-- Foto dos atletas: data URL JPEG (~256 px, comprimida no cliente), guardada na própria ficha.
-- A privacidade herda das políticas RLS de profiles / youth_athletes (sem buckets públicos).
-- As guardas guard_profile / guard_youth NÃO bloqueiam photo_url: o próprio atleta (e o responsável
-- pelos menores a seu cargo) pode alterá-la.
alter table public.profiles add column if not exists photo_url text;
alter table public.youth_athletes add column if not exists photo_url text;
