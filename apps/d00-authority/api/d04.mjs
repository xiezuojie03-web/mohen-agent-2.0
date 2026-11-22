// D04 issue/consume share ONE serverless function (Vercel Hobby allows at most
// 12 functions per deployment). vercel.json rewrites /api/d04-issue and
// /api/d04-consume here with ?route=; both dispatch into the SAME D04 authority
// composition as the D01–D03 endpoints (same signing key, journal login, HMAC
// credentials and stage binding). No authorization logic is changed by routing.
import { d04AuthorityEndpoint } from '../d01-authority.mjs';

export default async function d04(req,res){
 let route='/d04-issue';
 try{
  const parsed=new URL(req.url??'','https://d04-authority.invalid');
  if(parsed.searchParams.get('route')==='d04-consume')route='/consume';
  // The consume handler rejects any query string; vercel.json's routing hint
  // must not reach it. The authoritative route comes from `route` above.
  req.url=parsed.pathname;
 }catch{/* fail closed to the issue route, which rejects malformed requests */}
 await d04AuthorityEndpoint(route,req,res);
}
