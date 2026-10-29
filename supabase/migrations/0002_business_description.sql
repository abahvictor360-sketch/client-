-- Businesses without a website are analyzed from the owner's description.
alter table public.businesses alter column website drop not null;
alter table public.businesses add column description text;
alter table public.businesses add constraint businesses_source_present
  check (website is not null or (description is not null and length(description) between 15 and 500));
