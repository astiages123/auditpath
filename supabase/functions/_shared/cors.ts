const allowedOrigins = [
  'http://localhost:5173', // Lokal geliştirme için
  'https://sapiera.vercel.app', // Vercel canlı domainin,
];

export const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get('Origin');
  const allowedOrigin: string =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[1];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
};
