import {authorityEndpoint} from '../authority.mjs';

export default (request,response)=>authorityEndpoint('/token',request,response);
