-- Função para encontrar escolas num raio de X km usando a fórmula de Haversine
CREATE OR REPLACE FUNCTION get_nearby_schools(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  school_cycle TEXT DEFAULT NULL,
  max_dist_km DOUBLE PRECISION DEFAULT 20.0
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  district TEXT,
  municipality TEXT,
  nature TEXT,
  cycles TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  dist_km DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.name, 
    s.district, 
    s.municipality, 
    s.nature, 
    s.cycles, 
    s.address,
    s.latitude,
    s.longitude,
    (6371 * acos(
        cos(radians(user_lat)) * cos(radians(s.latitude)) * 
        cos(radians(s.longitude) - radians(user_lon)) + 
        sin(radians(user_lat)) * sin(radians(s.latitude))
    )) AS dist_km
  FROM public.schools s
  WHERE (school_cycle IS NULL OR s.cycles ILIKE '%' || school_cycle || '%')
    AND s.latitude IS NOT NULL 
    AND s.longitude IS NOT NULL
    AND (6371 * acos(
        cos(radians(user_lat)) * cos(radians(s.latitude)) * 
        cos(radians(s.longitude) - radians(user_lon)) + 
        sin(radians(user_lat)) * sin(radians(s.latitude))
    )) <= max_dist_km
  ORDER BY dist_km ASC;
END;
$$;
