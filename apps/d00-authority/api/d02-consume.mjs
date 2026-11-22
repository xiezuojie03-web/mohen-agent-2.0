import { d02AuthorityEndpoint } from '../d01-authority.mjs';

export default async function consume(req,res){
 await d02AuthorityEndpoint('/consume',req,res);
}
