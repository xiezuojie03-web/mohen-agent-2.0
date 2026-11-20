import {authorityEndpoint} from '../authority.mjs';

export default (request,response)=>authorityEndpoint('/consume',request,response);
