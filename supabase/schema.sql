-- Respuestas de los briefs de marca (estrategia y visual).
-- El formulario solo puede INSERTAR; leer las respuestas requiere iniciar sesión.
create table if not exists brief_responses (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  submission_id text not null,          -- identificador del navegador; un reenvío crea otra fila
  tipo          text not null check (tipo in ('estrategia', 'visual')),
  marca         text,
  nombre        text,
  correo        text,
  respuestas    jsonb not null,         -- respuestas crudas
  resumen       jsonb,                  -- [{seccion, filas:[{pregunta, respuesta}]}], listo para leer
  saltadas      text[]                  -- preguntas marcadas como "ya compartí esta información"
);
create index if not exists brief_responses_marca on brief_responses (marca, created_at desc);

alter table brief_responses enable row level security;
drop policy if exists "formulario inserta" on brief_responses;
create policy "formulario inserta" on brief_responses for insert to anon, authenticated
  with check (length(coalesce(marca, '')) < 200 and pg_column_size(respuestas) < 200000);
drop policy if exists "equipo lee" on brief_responses;
create policy "equipo lee" on brief_responses for select to authenticated using (true);
