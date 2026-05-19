-- seed.sql — default lookup data.
-- The default admin user is NOT seeded via SQL; create it from the Supabase
-- dashboard (Authentication → Users → "Add user") then run:
--   update public.profiles set role = 'Admin' where username = 'admin';

insert into public.payment_types (name) values
  ('Credit Card'), ('Debit Card'), ('Bank Transfer'), ('Cash'), ('E-Wallet')
  on conflict (name) do nothing;

insert into public.expense_types (name) values
  ('Utilities'), ('Rent'), ('Salary'), ('Office Supplies'),
  ('Software Subscription'), ('Travel')
  on conflict (name) do nothing;
