-- Create enum for user roles
create type public.app_role as enum ('student', 'staff', 'admin');

-- Create enum for complaint status
create type public.complaint_status as enum ('pending', 'in_progress', 'resolved', 'closed');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  batch text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Create categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamp with time zone default now()
);

alter table public.categories enable row level security;

-- Create complaints table
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text not null,
  attachment_url text,
  status complaint_status default 'pending' not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

alter table public.complaints enable row level security;

-- Create comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamp with time zone default now()
);

alter table public.comments enable row level security;

-- Create notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  complaint_id uuid references public.complaints(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

-- Create security definer function to check user roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create function to get user role
create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- Profiles RLS policies
create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- User roles RLS policies
create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage all roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Categories RLS policies
create policy "Anyone can view categories"
  on public.categories for select
  to authenticated
  using (true);

create policy "Admins can manage categories"
  on public.categories for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Complaints RLS policies
create policy "Students can view own complaints"
  on public.complaints for select
  to authenticated
  using (
    student_id = auth.uid() or
    assigned_to = auth.uid() or
    public.has_role(auth.uid(), 'admin')
  );

create policy "Students can create complaints"
  on public.complaints for insert
  to authenticated
  with check (
    student_id = auth.uid() and
    public.has_role(auth.uid(), 'student')
  );

create policy "Staff can update assigned complaints"
  on public.complaints for update
  to authenticated
  using (
    assigned_to = auth.uid() or
    public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can delete complaints"
  on public.complaints for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Comments RLS policies
create policy "Users can view comments on accessible complaints"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1 from public.complaints
      where id = complaint_id
      and (
        student_id = auth.uid() or
        assigned_to = auth.uid() or
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

create policy "Users can create comments on accessible complaints"
  on public.comments for insert
  to authenticated
  with check (
    author_id = auth.uid() and
    exists (
      select 1 from public.complaints
      where id = complaint_id
      and (
        student_id = auth.uid() or
        assigned_to = auth.uid() or
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- Notifications RLS policies
create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

create policy "System can create notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- Create function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  
  -- Assign student role by default
  insert into public.user_roles (user_id, role)
  values (new.id, 'student');
  
  return new;
end;
$$;

-- Trigger to create profile and role on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for complaints updated_at
create trigger update_complaints_updated_at
  before update on public.complaints
  for each row execute function public.update_updated_at();

-- Trigger for profiles updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- Insert default categories
insert into public.categories (name, description) values
  ('Technical', 'Issues related to software, hardware, or technical infrastructure'),
  ('Behavioral', 'Issues related to conduct, behavior, or interpersonal matters'),
  ('Infrastructure', 'Issues related to physical facilities and infrastructure'),
  ('Administrative', 'Issues related to administrative processes and procedures'),
  ('Other', 'Other issues that do not fit into the above categories');