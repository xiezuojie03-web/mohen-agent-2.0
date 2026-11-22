import { d04AuthorityEndpoint } from '../d01-authority.mjs';

export default async function issue(req,res){
 await d04AuthorityEndpoint('/d04-issue',req,res);
}
