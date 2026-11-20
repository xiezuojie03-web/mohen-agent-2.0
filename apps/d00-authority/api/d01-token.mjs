import { d01AuthorityEndpoint } from '../d01-authority.mjs';

export default async function token(req,res){
 await d01AuthorityEndpoint('/token',req,res);
}
