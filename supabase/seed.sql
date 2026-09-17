-- Optional demo election data. Run AFTER 0001_init.sql.
-- Does not create Auth users. Create users in the dashboard, then:
--   update public.profiles set role = 'admin' where id = '<your-user-uuid>';

insert into public.elections (name, date, total_votes_polled, count_limit, state)
select
  'GECI College Union Election 2026',
  '2026-09-16',
  1840,
  8,
  'setup'
where not exists (select 1 from public.elections);

do $$
declare
  v_election uuid;
  v_chairman uuid;
  v_vice uuid;
  v_secretary uuid;
  v_joint uuid;
  v_exec uuid;
  v_editor uuid;
begin
  select id into v_election from public.elections order by created_at desc limit 1;

  if not exists (select 1 from public.posts where election_id = v_election) then
    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Chairman', 1, 1)
    returning id into v_chairman;

    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Vice Chairman', 1, 2)
    returning id into v_vice;

    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Secretary', 1, 3)
    returning id into v_secretary;

    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Joint Secretary', 1, 4)
    returning id into v_joint;

    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Executive Member', 5, 5)
    returning id into v_exec;

    insert into public.posts (election_id, name, seats, display_order)
    values (v_election, 'Magazine Editor', 1, 6)
    returning id into v_editor;

    insert into public.candidates (post_id, name, panel_name, display_order) values
      (v_chairman, 'Arjun Menon', 'Unity Panel', 1),
      (v_chairman, 'Niveditha Raj', 'Progress Panel', 2),
      (v_vice, 'Fahad Rahman', 'Unity Panel', 1),
      (v_vice, 'Sneha Thomas', 'Progress Panel', 2),
      (v_secretary, 'Adithya Kumar', 'Unity Panel', 1),
      (v_secretary, 'Meera Nair', 'Progress Panel', 2),
      (v_joint, 'Rahul Krishnan', 'Unity Panel', 1),
      (v_joint, 'Anjali Suresh', 'Progress Panel', 2),
      (v_exec, 'Vishnu Prasad', 'Unity Panel', 1),
      (v_exec, 'Diya Mathew', 'Progress Panel', 2),
      (v_exec, 'Mohammed Irfan', 'Independent', 3),
      (v_exec, 'Kavya Ramesh', 'Unity Panel', 4),
      (v_exec, 'Joel Abraham', 'Progress Panel', 5),
      (v_exec, 'Aisha Banu', 'Independent', 6),
      (v_exec, 'Santhosh P', 'Unity Panel', 7),
      (v_editor, 'Neha Fathima', 'Unity Panel', 1),
      (v_editor, 'Abhinav Gopal', 'Progress Panel', 2);
  end if;
end $$;
