import { d01AuthorityEndpoint } from '../d01-authority.mjs';

export default async function issue(req,res){
 await d01AuthorityEndpoint('/d01-issue',req,res);
}
