ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS longitude double precision;

UPDATE public.resources SET latitude = 28.6139, longitude = 77.2090 WHERE id = '834a3977-850f-41b8-8f52-044a9ddb607e';
UPDATE public.resources SET latitude = 28.6280, longitude = 77.2190 WHERE id = 'daa2a0e9-90a4-479a-8d2c-aa6788df07e8';
UPDATE public.resources SET latitude = 28.6050, longitude = 77.2350 WHERE id = 'fe95f349-ecf6-4262-9171-2f44dac3e07c';
UPDATE public.resources SET latitude = 28.6350, longitude = 77.1950 WHERE id = '9c55d49f-2604-4e20-a688-2be737150d1b';
UPDATE public.resources SET latitude = 28.6200, longitude = 77.2100 WHERE id = 'c31473fc-f04e-4ad3-9824-654f19ec37e6';