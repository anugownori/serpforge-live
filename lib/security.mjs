import dns from 'node:dns/promises';
import {isIP} from 'node:net';

/** Restrict network access to globally routable HTTPS web hosts. */
export function isPublicIp(ip){
  if(!isIP(ip))return false;
  const v=ip.toLowerCase();
  if(isIP(v)===6){
    if(v.startsWith('::ffff:'))return isPublicIp(v.substring(7));
    // Only ordinary global-unicast IPv6; reject special use and documentation ranges.
    if(!/^[23][0-9a-f]{0,3}:/.test(v))return false;
    if(v.startsWith('2001:db8:')||v.startsWith('2001:0:')||v.startsWith('2001:10:')||v.startsWith('2002:'))return false;
    return true;
  }
  const [a,b,c]=v.split('.').map(Number);
  if(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0||a===192&&b===88&&c===99||a===192&&b===0&&c===170||a===198&&b>=18&&b<=19||a===198&&b===51&&c===100||a===203&&b===0&&c===113)return false;
  return true;
}
export async function validateTarget(raw){
  let u;try{u=new URL(String(raw))}catch{throw new Error('Enter a valid HTTPS website URL')}
  if(u.protocol!=='https:')throw new Error('Only public HTTPS websites are supported');
  if(u.username||u.password||u.port&&u.port!=='443')throw new Error('Credentials or custom ports are not permitted');
  if(u.hostname.length>253||!u.hostname.includes('.')||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal'))throw new Error('Enter a public domain');
  if(isIP(u.hostname)&&!isPublicIp(u.hostname))throw new Error('Private or reserved IP addresses are forbidden');
  const addresses=isIP(u.hostname)?[{address:u.hostname,family:isIP(u.hostname)}]:await dns.lookup(u.hostname,{all:true,verbatim:true});
  if(!addresses.length||addresses.some(a=>!isPublicIp(a.address)))throw new Error('Domain resolves to a private or reserved address');
  u.hash='';return {url:u,addresses};
}
