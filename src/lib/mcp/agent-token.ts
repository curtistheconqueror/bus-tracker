/* How an agent presents its token, and how that token is compared.

   Lives here rather than in the route because `app/` takes routing files only,
   and because both of these are rules worth asserting rather than trusting.
   The route needs a Worker to run; these need two strings. */

/* Compared without leaking where it stopped matching.

   A plain === on a secret returns as soon as two bytes differ, and the time it
   took is a measurement of how much of the token was right. This matters less
   over the public internet than the literature suggests, and it costs four
   lines, so there is no interesting reason to get it wrong.

   The length check short-circuits and therefore DOES leak the length. That is
   accepted: a token's length is not the secret, and comparing different-length
   strings byte-wise has no honest answer anyway. */
export function sameSecret(offered:string,expected:string){
 if(offered.length!==expected.length)return false;
 let difference=0;
 for(let index=0;index<offered.length;index+=1)difference|=offered.charCodeAt(index)^expected.charCodeAt(index);
 return difference===0;
}

/* The token an agent offered: the Authorization header first, the URL second.

   THE QUERY STRING IS NOT A SHORTCUT, IT IS THE ONLY WAY INTO MOST CLIENTS.
   A header is the better channel, which is why it wins when both are present.
   But a chat client that takes nothing but a URL cannot send one: claude.ai can
   attach a header only where its Request-headers beta is open to that
   organization, and ChatGPT's connector form documents OAuth or nothing at all.
   Both accept a URL. So `?token=` is what makes "paste this one line" true
   rather than aspirational, and it is what every hosted MCP server does for
   exactly this reason.

   The cost is real and worth naming rather than discovering: a URL travels
   where a header does not — into a connector's settings screen, a browser's
   history, an access log. That is why the header wins, why rotating MCP_TOKEN
   has to stay a one-line job, and why this trade is affordable only while the
   surface is read-only. It would want re-deciding before any tool here writes.

   `Bearer` is matched case-insensitively because the scheme is case-insensitive
   in HTTP, and the value is trimmed because a connector form that stores a
   pasted value verbatim will eventually store a trailing space. */
export function offeredToken(authorization:string,url:string){
 const header=authorization||"";
 if(header.toLowerCase().startsWith("bearer "))return header.slice(7).trim();
 /* A URL that will not parse cannot authenticate anybody, so it is simply no
    token rather than a thrown 500 — the 401 that follows says the same thing
    far more usefully to whoever is wiring this up. */
 try{return (new URL(url).searchParams.get("token")||"").trim()}catch{return ""}
}
