/* One signed-in client per isolate, and the rules for throwing it away.

   A sign-in costs a round trip, and an edge isolate can serve many requests, so
   caching the client is worth doing. Caching it FOREVER is not, and the reason
   is specific: the server holds no storage and runs no refresh timer, so the
   access token behind that client expires on its own schedule. A cache that
   never lets go would then fail every read in that isolate for as long as the
   isolate lives — an endpoint that works for an hour of uptime and then stops,
   with nothing in the logs but "the shop cloud could not be read".

   So the cache is a best-effort optimisation and never a source of truth:

     * A FAILED SIGN-IN IS NOT CACHED. The next request tries again rather than
       inheriting somebody else's bad minute.
     * A FAILED READ DROPS THE CLIENT. The commonest reason a read fails on a
       client that just worked is that its session went stale, and re-signing in
       is cheap next to staying broken. A refused read — a permission problem
       rather than an expiry — costs one extra sign-in on a request that was
       failing anyway, which is the right way round to be wrong.
     * THE KEY INCLUDES EVERY CREDENTIAL, the password among them. Keyed on the
       URL and email alone, a rotated password would leave a warm isolate
       serving from a session signed in with the old one, and the rotation would
       appear not to have taken.

   Lives here rather than in the route because `app/` takes routing files only,
   and because a cache whose whole value is in when it lets go is worth being
   able to test. The route cannot be: it needs a Worker and a real project. */

export type SignIn<T>=()=>Promise<{client:T|null;error:string}>;
export type CachedClient<T>={client:T|null;error:string};

export type SessionCache<T>={
 get(key:string,signIn:SignIn<T>):Promise<CachedClient<T>>;
 /* Pass the client whose read failed, so a slow failure cannot clear a newer
    session that a later request signed in. Omitted, it clears whatever is
    cached. */
 invalidate(stale?:T|null):void;
 /* For tests and for anybody wondering whether a warm isolate is being reused.
    Never a decision input — code that branches on this is code that wants
    `get`. */
 isWarm():boolean;
};

export function createSessionCache<T>():SessionCache<T>{
 let client:T|null=null;
 let cached="";
 /* Which attempt is allowed to write. An `await` yields, so a sign-in started
    before the credentials changed can finish AFTER one started with the new
    ones, and without this it would overwrite the newer client with a session
    signed in against the old password. Only the newest attempt may land. */
 let generation=0;
 /* Sign-ins currently in flight, by key. An isolate serves requests
    concurrently, so without this every request that arrives while the first
    sign-in is still awaiting would start its own: an agent firing five tools at
    once would cost five sign-ins against an auth endpoint that rate-limits, on
    exactly the cold start where the route's own comment promises one. */
 const pending=new Map<string,Promise<CachedClient<T>>>();
 return {
  async get(key:string,signIn:SignIn<T>){
   if(client&&cached===key)return {client,error:""};
   const inFlight=pending.get(key);
   if(inFlight)return inFlight;
   const mine=++generation;
   const attempt=(async():Promise<CachedClient<T>>=>{
    const fresh=await signIn();
    if(!fresh.client)return {client:null,error:fresh.error||"The shop cloud could not be reached."};
    if(mine===generation){client=fresh.client;cached=key}
    /* The caller gets the client it actually signed in, whether or not it won
       the race to be cached. Handing back `null` because a newer attempt landed
       first would fail a request that has a perfectly good session in hand. */
    return {client:fresh.client,error:""};
   })();
   pending.set(key,attempt);
   try{return await attempt}
   finally{if(pending.get(key)===attempt)pending.delete(key)}
  },
  /* `stale` is the client whose read failed, and only that client is cleared.

     Without it, a slow failing read could drop a client that a later request
     had already signed in and cached — A reads, something invalidates, B signs
     in fresh, then A's failure arrives and throws away B's good session. The
     cost is only another sign-in, never a wrong answer, but it is the kind of
     waste that compounds under exactly the load the pending map above exists
     for. Called with nothing, it still clears unconditionally, because a caller
     that does not know which client failed is asking for the safe thing. */
  invalidate(stale?:T|null){
   if(stale!==undefined&&stale!==client)return;
   client=null;
   cached="";
  },
  isWarm(){return client!==null},
 };
}

/* Every credential, in one string, so that changing any of them changes the
   key. The password is in here deliberately: this string never leaves the
   isolate, which already holds the password in memory to sign in with, so
   there is no exposure that did not already exist — and leaving it out is how
   a rotation silently fails to take effect. */
export function sessionCacheKey(credentials:{url:string;anonKey:string;email:string;password:string}){
 return [credentials.url,credentials.anonKey,credentials.email,credentials.password].join("|");
}
