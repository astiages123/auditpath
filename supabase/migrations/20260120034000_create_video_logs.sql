create table "public"."video_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references "auth"."users"("id") on delete cascade,
    "video_id" uuid not null references "public"."videos"("id") on delete cascade,
    "course_id" uuid references "public"."courses"("id") on delete set null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."video_logs" enable row level security;

create policy "Users can view their own video logs"
on "public"."video_logs"
for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "Users can insert their own video logs"
on "public"."video_logs"
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- Mevcut verileri aktar (yaklaşık tarihçe)
insert into "public"."video_logs" (user_id, video_id, created_at, course_id)
select 
    vp.user_id, 
    vp.video_id, 
    coalesce(vp.completed_at, vp.updated_at, now()) as created_at,
    v.course_id
from "public"."video_progress" vp
join "public"."videos" v on vp.video_id = v.id
where vp.completed = true;
