import { d03AuthorityEndpoint } from '../d01-authority.mjs';

export default async function consume(req,res){
 await d03AuthorityEndpoint('/consume',req,res);
}
