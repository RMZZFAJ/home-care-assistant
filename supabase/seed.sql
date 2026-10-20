-- Somente dados fictícios para desenvolvimento local.
insert into public.care_recipients (display_name, is_development)
values ('Pessoa assistida de desenvolvimento', true)
on conflict do nothing;
