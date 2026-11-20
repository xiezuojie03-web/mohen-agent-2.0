import { d01AuthorityEndpoint } from '../d01-authority.mjs';

export default async function consume(req,res){
 await d01AuthorityEndpoint('/consume',req,res);
}
