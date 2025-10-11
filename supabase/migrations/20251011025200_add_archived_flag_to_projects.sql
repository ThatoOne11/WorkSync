alter table projects
add column is_archived boolean not null default false;

comment on column projects.is_archived is 'Flags if a project is archived and should not appear in the active list.';