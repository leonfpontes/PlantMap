-- Shift occurrences from Brasília (~ -15.78, -47.93) to Ribeirão Preto (~ -21.18, -47.82)
-- Latitude delta: -5.3970
-- Longitude delta: 0.1089

UPDATE public.occurrences
SET location = st_point(
  st_x(location::geometry) + 0.1089,
  st_y(location::geometry) - 5.3970
)::geography;
