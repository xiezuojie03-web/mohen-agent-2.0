// D04 and D05 issue/consume share ONE serverless function (Vercel Hobby allows
// at most 12 functions per deployment). vercel.json rewrites /api/d04-issue,
// /api/d04-consume, /api/d05-issue and /api/d05-consume here with ?route=; each
// dispatches into the SAME authority composition (same signing key, journal
// login, HMAC credentials and per-stage binding) selected by the route group.
// No authorization logic is changed by routing; D05 keeps its own journal,
// grant binding and G4 qualification checker.
import { d04AuthorityEndpoint, d05AuthorityEndpoint } from '../d01-authority.mjs';

export default async function d04(req,res){
 let group=d04AuthorityEndpoint;
 let route='/d04-issue';
 try{
  const parsed=new URL(req.url??'','https://d04-authority.invalid');
  const hint=parsed.searchParams.get('route');
  if(hint==='d04-consume')route='/consume';
  else if(hint==='d05-issue'){group=d05AuthorityEndpoint;route='/d05-issue';}
  else if(hint==='d05-consume'){group=d05AuthorityEndpoint;route='/consume';}
  // The consume handler rejects any query string; vercel.json's routing hint
  // must not reach it. The authoritative route comes from `route` above.
  req.url=parsed.pathname;
 }catch{/* fail closed to the D04 issue route, which rejects malformed requests */}
 await group(route,req,res);
}
