import {getRun} from '../../../../lib/runner.mjs';
export const runtime='nodejs';
export async function GET(_req,{params}){
  const {id}=await params,run=await getRun(id);
  if(!run?.patch?.diff)return Response.json({error:'No source patch for this investigation'},{status:404});
  return new Response(run.patch.diff,{headers:{'Content-Type':'text/x-diff; charset=utf-8','Content-Disposition':`attachment; filename="serpforge-${id}.patch"`,'Cache-Control':'private, no-store'}});
}
