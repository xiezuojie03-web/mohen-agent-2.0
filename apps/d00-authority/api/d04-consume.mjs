import { d04AuthorityEndpoint } from '../d01-authority.mjs';

export default async function consume(req,res){
 await d04AuthorityEndpoint('/consume',req,res);
}
