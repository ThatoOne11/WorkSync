-- Insert the new settings keys with default values.
-- We use INSERT ... ON CONFLICT DO NOTHING to avoid errors if the keys already exist.
insert into settings
    (key, value)
values
    ('notificationEmail', ''),
    ('enableEmailNotifications', 'false')
on conflict
(key) do nothing;