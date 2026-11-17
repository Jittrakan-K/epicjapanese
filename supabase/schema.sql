-- Epic Japanese: บัญชีแบบชื่อผู้ใช้ + รหัสผ่าน ไม่ใช้อีเมล
-- วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ej_accounts (
  username      text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  pass_hash     text not null,
  recovery_hash text not null,
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  fails         int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);
create table if not exists public.ej_sessions (
  token_hash text primary key,
  username   text not null references public.ej_accounts(username) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
-- เปิด RLS โดยไม่มี policy: หน้าเว็บอ่าน/เขียนตารางตรงๆ ไม่ได้ ต้องผ่านฟังก์ชันด้านล่างเท่านั้น
alter table public.ej_accounts enable row level security;
alter table public.ej_sessions enable row level security;
revoke all on public.ej_accounts, public.ej_sessions from anon, authenticated;

create or replace function public.ej__session(u text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  insert into ej_sessions(token_hash, username) values (encode(digest(t, 'sha256'), 'hex'), u);
  return t;
end $$;

create or replace function public.ej__user(tok text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare u text;
begin
  update ej_sessions set last_seen = now()
   where token_hash = encode(digest(coalesce(tok, ''), 'sha256'), 'hex')
   returning username into u;
  return u;
end $$;

create or replace function public.ej_signup(p_username text, p_password text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(p_username)); rc text := upper(encode(gen_random_bytes(6), 'hex'));
begin
  if u !~ '^[a-z0-9_]{3,20}$' then return jsonb_build_object('error', 'bad_username'); end if;
  if length(coalesce(p_password, '')) < 6 then return jsonb_build_object('error', 'short_password'); end if;
  if octet_length(coalesce(p_data, '{}')::text) > 1000000 then return jsonb_build_object('error', 'too_big'); end if;
  if exists (select 1 from ej_accounts where username = u) then return jsonb_build_object('error', 'taken'); end if;
  insert into ej_accounts(username, pass_hash, recovery_hash, data)
  values (u, crypt(p_password, gen_salt('bf', 10)), crypt(rc, gen_salt('bf', 10)), coalesce(p_data, '{}'));
  return jsonb_build_object('username', u, 'token', ej__session(u), 'recovery', rc,
    'updated_at', (select updated_at from ej_accounts where username = u));
exception when unique_violation then return jsonb_build_object('error', 'taken');
end $$;

create or replace function public.ej_login(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a ej_accounts; u text := lower(trim(p_username));
begin
  select * into a from ej_accounts where username = u for update;
  if not found then return jsonb_build_object('error', 'bad_login'); end if;
  if a.locked_until > now() then return jsonb_build_object('error', 'locked', 'until', a.locked_until); end if;
  if a.pass_hash <> crypt(coalesce(p_password, ''), a.pass_hash) then
    update ej_accounts set fails = fails + 1,
      locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' end
     where username = u;
    return jsonb_build_object('error', 'bad_login');
  end if;
  update ej_accounts set fails = 0, locked_until = null where username = u;
  return jsonb_build_object('username', u, 'token', ej__session(u), 'data', a.data, 'updated_at', a.updated_at);
end $$;

create or replace function public.ej_load(p_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := ej__user(p_token); a ej_accounts;
begin
  if u is null then return jsonb_build_object('error', 'bad_session'); end if;
  select * into a from ej_accounts where username = u;
  return jsonb_build_object('username', u, 'data', a.data, 'updated_at', a.updated_at);
end $$;

-- บันทึก: ถ้าข้อมูลบนเซิร์ฟเวอร์ใหม่กว่า p_base จะไม่ทับ แต่ส่งข้อมูลล่าสุดกลับไปให้หน้าเว็บรวมก่อน
create or replace function public.ej_save(p_token text, p_data jsonb, p_base timestamptz)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := ej__user(p_token); a ej_accounts; t timestamptz;
begin
  if u is null then return jsonb_build_object('error', 'bad_session'); end if;
  if octet_length(coalesce(p_data, '{}')::text) > 1000000 then return jsonb_build_object('error', 'too_big'); end if;
  select * into a from ej_accounts where username = u for update;
  if p_base is null or a.updated_at > p_base then
    return jsonb_build_object('error', 'conflict', 'data', a.data, 'updated_at', a.updated_at);
  end if;
  update ej_accounts set data = p_data, updated_at = clock_timestamp() where username = u returning updated_at into t;
  return jsonb_build_object('updated_at', t);
end $$;

create or replace function public.ej_logout(p_token text)
returns jsonb language sql security definer set search_path = public, extensions as $$
  delete from ej_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select jsonb_build_object('ok', true);
$$;

create or replace function public.ej_change_password(p_token text, p_old text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := ej__user(p_token); a ej_accounts;
begin
  if u is null then return jsonb_build_object('error', 'bad_session'); end if;
  if length(coalesce(p_new, '')) < 6 then return jsonb_build_object('error', 'short_password'); end if;
  select * into a from ej_accounts where username = u;
  if a.pass_hash <> crypt(coalesce(p_old, ''), a.pass_hash) then return jsonb_build_object('error', 'bad_login'); end if;
  update ej_accounts set pass_hash = crypt(p_new, gen_salt('bf', 10)) where username = u;
  delete from ej_sessions where username = u and token_hash <> encode(digest(p_token, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end $$;

-- ลืมรหัสผ่าน: ใช้รหัสกู้คืนตั้งรหัสใหม่ ได้รหัสกู้คืนชุดใหม่ และออกจากระบบทุกเครื่อง
create or replace function public.ej_recover(p_username text, p_code text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a ej_accounts; u text := lower(trim(p_username));
        c text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g'));
        rc text := upper(encode(gen_random_bytes(6), 'hex'));
begin
  select * into a from ej_accounts where username = u for update;
  if not found then return jsonb_build_object('error', 'bad_login'); end if;
  if a.locked_until > now() then return jsonb_build_object('error', 'locked', 'until', a.locked_until); end if;
  if length(coalesce(p_new, '')) < 6 then return jsonb_build_object('error', 'short_password'); end if;
  if a.recovery_hash <> crypt(c, a.recovery_hash) then
    update ej_accounts set fails = fails + 1,
      locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' end
     where username = u;
    return jsonb_build_object('error', 'bad_login');
  end if;
  update ej_accounts set pass_hash = crypt(p_new, gen_salt('bf', 10)), recovery_hash = crypt(rc, gen_salt('bf', 10)),
    fails = 0, locked_until = null where username = u;
  delete from ej_sessions where username = u;
  return jsonb_build_object('username', u, 'token', ej__session(u), 'recovery', rc, 'data', a.data, 'updated_at', a.updated_at);
end $$;

create or replace function public.ej_delete(p_token text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u text := ej__user(p_token); a ej_accounts;
begin
  if u is null then return jsonb_build_object('error', 'bad_session'); end if;
  select * into a from ej_accounts where username = u;
  if a.pass_hash <> crypt(coalesce(p_password, ''), a.pass_hash) then return jsonb_build_object('error', 'bad_login'); end if;
  delete from ej_accounts where username = u;
  return jsonb_build_object('ok', true);
end $$;

-- สิทธิ์: หน้าเว็บเรียกได้เฉพาะฟังก์ชันที่ตั้งใจเปิด ฟังก์ชันช่วยภายในเรียกจากภายนอกไม่ได้
revoke all on function public.ej__session(text), public.ej__user(text) from public, anon, authenticated;
revoke all on function public.ej_signup(text, text, jsonb), public.ej_login(text, text), public.ej_load(text),
  public.ej_save(text, jsonb, timestamptz), public.ej_logout(text), public.ej_change_password(text, text, text),
  public.ej_recover(text, text, text), public.ej_delete(text, text) from public;
grant execute on function public.ej_signup(text, text, jsonb), public.ej_login(text, text), public.ej_load(text),
  public.ej_save(text, jsonb, timestamptz), public.ej_logout(text), public.ej_change_password(text, text, text),
  public.ej_recover(text, text, text), public.ej_delete(text, text) to anon;
