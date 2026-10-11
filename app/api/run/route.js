import {NextResponse} from 'next/server';
import {startRun} from '../../../lib/runner.mjs';
export const runtime='nodejs';
export async function POST(req){
  try{
    const raw=await req.text();if(raw.length>7000)return NextResponse.json({error:'Request too large'},{status:413});
    const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const client=/^[\da-f:.]{3,45}$/i.test(forwarded||'')?forwarded:'local';
    const result=await startRun(JSON.parse(raw),{client,accessKey:req.headers.get('x-serpforge-access')||''});
    return NextResponse.json(result,{status:202});
  }catch(e){return NextResponse.json({error:String(e.message).slice(0,300)},{status:400})}
}
