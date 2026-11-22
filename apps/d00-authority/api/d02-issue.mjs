import { d02AuthorityEndpoint } from '../d01-authority.mjs';

export default async function issue(req,res){
 await d02AuthorityEndpoint('/d02-issue',req,res);
}
