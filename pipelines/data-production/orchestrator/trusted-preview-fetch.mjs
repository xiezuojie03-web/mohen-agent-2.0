// Forward Vercel's short-lived service identity only to the configured Preview.
export function createTrustedPreviewFetch(environment,fetcher=fetch){
 const token=environment.MOHEN_D00_PREVIEW_OIDC_TOKEN;
 const host=environment.MOHEN_D00_AUTHORITY_PREVIEW_HOST;
 return (input,init)=>{
  if(!token||!host||!host.endsWith('.vercel.app'))return fetcher(input,init);
  const url=new URL(String(input));
  if(url.protocol!=='https:'||url.host!==host)return fetcher(input,init);
  const headers=new Headers(init?.headers);
  headers.set('x-vercel-trusted-oidc-idp-token',token);
  return fetcher(input,{...init,headers,redirect:'error'});
 };
}
