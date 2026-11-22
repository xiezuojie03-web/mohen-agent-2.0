import { d03AuthorityEndpoint } from '../d01-authority.mjs';

export default async function issue(req,res){
 await d03AuthorityEndpoint('/d03-issue',req,res);
}
