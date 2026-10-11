import {NextResponse} from 'next/server';
import {startRun,execute} from '../../../lib/runner.mjs';

export const runtime='nodejs';

// Allow this function up to 300 seconds on Vercel (configured in vercel.json).
// The full scan (crawl + SerpApi calls + optional GitHub patch) can take 1–3 minutes.
export const maxDuration=300;

export async function POST(req){
  try{
    const raw=await req.text();
    if(raw.length>7000)return NextResponse.json({error:'Request too large'},{status:413});
    const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const client=/^[\da-f:.]{3,45}$/i.test(forwarded||'')?forwarded:'local';
    // 1. Validate input and create the run record.
    const run=await startRun(JSON.parse(raw),{client,accessKey:req.headers.get('x-serpforge-access')||''});
    // 2. Run the full investigation synchronously — this is the architectural fix.
    //    The Vercel function stays alive until execute() resolves.
    await execute(run);
    // 3. Return the completed run object. The client no longer needs to poll.
    return NextResponse.json(run,{status:200});
  }catch(e){
    return NextResponse.json({error:String(e.message).slice(0,300)},{status:400});
  }
}
