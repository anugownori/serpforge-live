export const runtime='nodejs';
export async function GET(){return Response.json({status:'ok',liveSerpApiConfigured:Boolean(process.env.SERPAPI_KEY),timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}
