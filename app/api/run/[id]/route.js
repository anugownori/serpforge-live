import {NextResponse} from 'next/server';
import {getRun} from '../../../../lib/runner.mjs';
export const runtime='nodejs';
export async function GET(_req,{params}){const {id}=await params;const run=await getRun(id);return run?NextResponse.json(run,{headers:{'Cache-Control':'no-store'}}):NextResponse.json({error:'Run not found'},{status:404})}
