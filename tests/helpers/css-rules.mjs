/* A CSS READER THAT DOES NOT LIE ABOUT WHAT IS IN A STYLESHEET.

   The first version of this lived inline in a test and was written as
   `css.split("}").map(part => part.split("{"))`. A cold read found twelve ways
   past it in one sitting, two of which were already live in this repo. The
   failures were all the same shape — a split is not a parser:

   - `media` was set when an at-rule prelude was seen and never cleared when
     its block closed, so a `@media(min-width:761px)` block made the scan skip
     EVERY following top-level rule in that file. Measured: 87 rules in
     settings.css, most of the file.
   - the prelude and the first nested selector landed in one chunk, so the
     FIRST rule inside every `@media` block was never read — which is exactly
     where somebody adds a phone font-size.
   - comments were stripped with `/\*[\s\S]*?\*\//g`, the naive regex CLAUDE.md
     records as a two-bug mistake, and declaration bodies were not stripped at
     all, so a commented-out value could be read as live.

   So this walks the text with a brace stack and is aware of strings. It is the
   string-aware approach `tests/settings.test.mjs` already had to arrive at for
   the sound tripwire, for the same reason. */

/* Comments out, strings kept — an audio path or a content string only ever
   lives in a string, and a `/*` inside one does not open a comment. */
export function stripComments(css){
 let out="",quote="",i=0;
 while(i<css.length){
  const char=css[i];
  if(quote){
   out+=char;
   if(char==="\\"){out+=css[i+1]??"";i+=2;continue}
   if(char===quote)quote="";
   i++;continue;
  }
  if(char==='"'||char==="'"){quote=char;out+=char;i++;continue}
  if(char==="/"&&css[i+1]==="*"){
   const end=css.indexOf("*/",i+2);
   i=end===-1?css.length:end+2;
   /* A space, so `a/*x*\/b` cannot fuse into one token. */
   out+=" ";continue;
  }
  out+=char;i++;
 }
 return out;
}

/* Every style rule in the sheet, each with the at-rule preludes enclosing it.
   Nested at-rules are kept as a list rather than one string, so a caller can
   ask about any of them — `@media` inside `@supports` defeated the old one. */
export function cssRules(rawCss){
 const css=stripComments(rawCss);
 const rules=[];
 const stack=[];          /* the at-rule preludes we are inside */
 let buffer="",quote="",i=0;
 while(i<css.length){
  const char=css[i];
  if(quote){
   buffer+=char;
   if(char==="\\"){buffer+=css[i+1]??"";i+=2;continue}
   if(char===quote)quote="";
   i++;continue;
  }
  if(char==='"'||char==="'"){quote=char;buffer+=char;i++;continue}
  if(char==="{"){
   const prelude=buffer.trim();buffer="";
   if(prelude.startsWith("@")){stack.push(prelude);i++;continue}
   /* A style rule: read to its matching close, strings and nesting aware. */
   let depth=1,body="",j=i+1,q="";
   while(j<css.length&&depth>0){
    const c=css[j];
    if(q){body+=c;if(c==="\\"){body+=css[j+1]??"";j+=2;continue}if(c===q)q="";j++;continue}
    if(c==='"'||c==="'"){q=c;body+=c;j++;continue}
    if(c==="{")depth++;
    if(c==="}"){depth--;if(!depth){j++;break}}
    body+=c;j++;
   }
   rules.push({selector:prelude,body,at:[...stack]});
   i=j;continue;
  }
  if(char==="}"){stack.pop();buffer="";i++;continue}
  buffer+=char;i++;
 }
 return rules;
}

/* The font size a declaration block sets, in px, or null.
   Reads `font-size` AND the `font` shorthand, because a live 9px textarea in
   this repo is declared `font:700 9px/1.3 var(--log-font)` and the old scan
   could not see it. Case, spacing, `!important` and a missing final semicolon
   are all normal CSS and none of them may hide a value.
   The LAST declaration wins, which is what the cascade does within one block. */
export function declaredFontSizePx(body,rootPx=16){
 let found=null;
 const text=body.replace(/\s+/g," ");
 for(const match of text.matchAll(/(?:^|[;{])\s*(font-size|font)\s*:\s*([^;}]+)/gi)){
  const property=match[1].toLowerCase();
  const value=match[2].replace(/!important/i,"").trim();
  const size=property==="font-size"?value:shorthandSize(value);
  const px=toPx(size,rootPx);
  if(px!==null)found=px;
 }
 return found;
}

/* `font: [style] [variant] [weight] [stretch] <size>[/<line-height>] <family>`
   — the size is the first length-ish token, and the family follows it. */
function shorthandSize(value){
 for(const token of value.split(" ")){
  const size=token.split("/")[0];
  if(/^-?[\d.]+(px|rem|em|pt|%)$/i.test(size)||/^0(\.0*)?$/.test(size))return size;
 }
 return "";
}

/* Only units that resolve to a fixed px here. A `clamp()`, a `var()` or a
   viewport unit cannot be answered by reading one file, so they come back null
   and the caller treats them as unknown rather than as safe. */
function toPx(value,rootPx){
 /* A BARE `0` IS A VALID LENGTH and was the one mutation the Down Sheet's
    rebuilt gate still missed: `font-size:0` came back null, the caller read
    that as "no size declared here", and the 8px from the rule above stood.
    Unitless anything ELSE is not a length and still comes back null. */
 const text=String(value).trim();
 if(/^-?0(\.0*)?$/.test(text))return 0;
 const match=text.match(/^(-?[\d.]+)(px|rem|em|pt|%)$/i);
 if(!match)return null;
 const number=Number(match[1]);
 if(!Number.isFinite(number))return null;
 switch(match[2].toLowerCase()){
  case "px":return number;
  case "pt":return number*4/3;
  case "rem":case "em":return number*rootPx;
  case "%":return number/100*rootPx;
  default:return null;
 }
}

/* Does this selector name a control a touch keyboard opens for?

   A SELECTOR LIST IS TESTED PART BY PART, because a rule may name a control in
   one part and something else in another, and the answer is "yes" if any part
   does.

   A PART CARRYING A PSEUDO-ELEMENT IS NOT ONE. `input::placeholder` styles the
   grey text inside a field; it cannot be focused and no keyboard opens for it,
   so it cannot move the page. The first version of this record carried two
   such rows and described them as fields "tapping one still zooms" — both sit
   on inputs that are 26px to begin with. */
export function isTextEntrySelector(selector){
 return splitSelector(selector).some(part=>
  !part.includes("::")&&/(^|[\s,>+~([])(input|textarea|select)([\s>+~)\].:#[]|$)/i.test(part));
}

/* Commas inside `:is(...)`, `:not(...)` or an attribute string do not separate
   selectors. */
export function splitSelector(selector){
 const parts=[];let depth=0,quote="",current="";
 for(let i=0;i<selector.length;i++){
  const char=selector[i];
  if(quote){current+=char;if(char==="\\"){current+=selector[++i]??"";continue}if(char===quote)quote="";continue}
  if(char==='"'||char==="'"){quote=char;current+=char;continue}
  if(char==="("||char==="[")depth++;
  if(char===")"||char==="]")depth--;
  if(char===","&&depth===0){parts.push(current.trim());current="";continue}
  current+=char;
 }
 if(current.trim())parts.push(current.trim());
 return parts;
}

/* THE EFFECTIVE DECLARATIONS ON ONE ELEMENT, AT ONE VIEWPORT WIDTH.

   A REGEX OVER A STYLESHEET CANNOT SEE THE CASCADE, and a gate written as one
   is not a gate. The Down Sheet's MARK FIXED test is the worked example: its
   first version matched `/\.fix-entry b\{font-size:8px/`, its second computed
   "the last rule whose selector string is exactly this one", and a cold read
   walked thirteen mutations past the second in one sitting. Every one of them
   is ordinary CSS:

   - `.row-actions .fix-entry b{display:none}` — a descendant form, which a
     string compare cannot see, and which has HIGHER specificity than the rule
     it beats.
   - `display:none!important` — stored as the string `"none!important"`, so a
     compare against `"none"` passed.
   - `display:None` — CSS keywords are case-insensitive and the compare was not.
   - `@media(max-width:900px){...}` — dropped because the at-rule was not
     spelled `max-width:760px`, and this stylesheet already uses 900px twice.
   - `font:900 1px/1 Arial` — a shorthand, invisible to a `font-size` read.
     `declaredFontSizePx` above exists for exactly this and was not used.
   - `transform:scale(0)` — past a guard that required a decimal point.
   - a plain later rule appended anywhere in the file.

   So this resolves one element the way a browser does, as far as a stylesheet
   can be resolved without rendering it: every rule that targets the element
   and whose at-rules apply at `width`, ordered by `!important`, then
   specificity, then source position, last one winning.

   IT IS A TRIPWIRE AND NOT A PROOF — the standing this repository already
   takes for the sound scan, and worth restating because a parser invites more
   trust than a regex. What it cannot see: a class JavaScript toggles, a
   `var()` whose value lives in another file, inheritance from an ancestor it
   was not told about, a colour that matches a background set elsewhere, a
   parent hidden three levels up, and anything behind a pseudo-class, which it
   skips on purpose — `.fix-entry:hover` paints white on green, and counting it
   would have the gate reading the hover ink and calling the word invisible.
   What it stops is somebody restyling a control without knowing there was a
   rule about it. Measure the real thing in a browser before writing
   "verified".

   `element` says where the element really sits, because specificity and
   descendant selectors cannot be answered without it:

     {tag, classes, ancestors:[{tag, classes}, ...]}   outermost first

   A rule whose ancestor parts name something outside that chain does not
   apply and is skipped. Anything this CANNOT decide — an unreadable media
   feature, an `@supports`, an at-rule it does not know — is treated as
   APPLYING, so an unparsed wrapper fails the gate rather than hiding a
   change. */
export function effectiveStyle(rawCss,element,width){
 const matched=[];
 cssRules(rawCss).forEach((rule,order)=>{
  if(!atRulesApply(rule.at,width))return;
  let best=null;
  for(const part of splitSelector(rule.selector)){
   const score=selectorScore(part,element);
   if(score&&(!best||compareSpecificity(score,best)>0))best=score;
  }
  if(best)matched.push({rule,order,score:best});
 });
 matched.sort((a,b)=>compareSpecificity(a.score,b.score)||a.order-b.order);
 /* Two passes, which IS the cascade: everything normal in specificity order,
    then everything `!important` in specificity order over the top. */
 const style={};
 const inherited=Number(element.inheritedFontSizePx)||16;
 let fontSizePx=null;
 for(const important of [false,true])
  for(const {rule} of matched){
   for(const declaration of declarations(rule.body)){
    if(declaration.important!==important)continue;
    style[declaration.property]=declaration.value;
    /* The SIZE goes through `declaredFontSizePx`, not `parseFloat`, so the
       `font` shorthand and a `%` or `rem` unit are read rather than guessed.
       `parseFloat("40%")` is 40, which is how `font-size:40%` — 6.8px on this
       button — passed a gate asserting at least 8px. */
    if(declaration.property==="font-size"||declaration.property==="font"){
     const size=declaredFontSizePx(declaration.property+":"+declaration.value,inherited);
     if(size!==null)fontSizePx=size;
    }
   }
  }
 style.fontSizePx=fontSizePx;
 return style;
}

/* Which `!important` beats which is already handled by the two passes above;
   this only orders by specificity, as a browser does on a tie. */
function compareSpecificity(a,b){
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]-b[i];
 return 0;
}

/* One declaration block, in source order, with `!important` lifted OFF the
   value — leaving it on is what let `display:none!important` read as the
   string `"none!important"` and pass a compare against `"none"`. */
function declarations(body){
 const out=[];
 for(const part of String(body||"").split(";")){
  const colon=part.indexOf(":");
  if(colon<=0)continue;
  const property=part.slice(0,colon).trim().toLowerCase();
  let value=part.slice(colon+1).trim();
  const important=/!\s*important$/i.test(value);
  if(important)value=value.replace(/!\s*important$/i,"").trim();
  if(!property||!value)continue;
  out.push({property,value:value.toLowerCase(),important});
 }
 return out;
}

/* Every at-rule a style rule sits inside has to apply for the rule to.
   An `@media` is read; anything else — `@supports`, `@layer`, an at-rule this
   does not know — is treated as applying, because a gate that silently drops
   rules is the bug this file exists to answer. */
function atRulesApply(at,width){
 for(const prelude of at||[]){
  const text=String(prelude).replace(/\s+/g," ").trim();
  if(!/^@media\b/i.test(text))continue;
  if(!mediaMatches(text.replace(/^@media\b/i,"").trim(),width))return false;
 }
 return true;
}

/* A comma list applies if ANY of its queries does. Reused splitSelector
   because a comma inside `(...)` does not separate queries either. */
function mediaMatches(query,width){
 const parts=splitSelector(query);
 return parts.length?parts.some(part=>oneQueryMatches(part,width)):true;
}

function oneQueryMatches(query,width){
 const text=query.trim().toLowerCase();
 /* `print` alone never applies to the screen this app is used on; `not print`
    does. Anything else about the media TYPE is treated as applying. */
 if(/(^|\s)print(\s|$)/.test(text)&&!/(^|\s)not(\s|$)/.test(text))return false;
 for(const feature of text.matchAll(/\(([^)]*)\)/g)){
  const match=feature[1].match(/^\s*(min|max)-width\s*:\s*([\d.]+)px\s*$/);
  if(!match)continue;                 /* unreadable: treat as applying */
  const bound=Number(match[2]);
  if(match[1]==="max"&&width>bound)return false;
  if(match[1]==="min"&&width<bound)return false;
 }
 return true;
}

/* Does this selector target the element, and at what specificity?
   null means it does not, or that this cannot tell — the two cases a caller
   must not be able to confuse with "it does and says nothing". */
function selectorScore(selector,element){
 const text=selector.trim();
 if(!text)return null;
 /* A PSEUDO-CLASS OR PSEUDO-ELEMENT IS NOT THE RESTING ELEMENT, and reading
    one would answer a different question. See the note above. */
 if(text.includes(":"))return null;
 const compounds=text.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
 if(!compoundMatches(compounds[compounds.length-1],element))return null;
 const chain=element.ancestors||[];
 for(const compound of compounds.slice(0,-1))
  if(!chain.some(ancestor=>compoundMatches(compound,ancestor)))return null;
 let ids=0,classes=0,tags=0;
 for(const token of text.matchAll(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|[a-z][\w-]*/gi)){
  const one=token[0];
  if(one.startsWith("#"))ids++;
  else if(one.startsWith(".")||one.startsWith("["))classes++;
  else tags++;
 }
 return [ids,classes,tags];
}

function compoundMatches(compound,node){
 if(!compound)return false;
 if(compound==="*")return true;
 /* An id or an attribute is something this was not told about, so it cannot
    answer — and saying "no" here is the safe half: the rule is skipped and
    the gate reads the rules it can see. */
 if(/[#[]/.test(compound))return false;
 const tag=(compound.match(/^[a-z][\w-]*/i)||[])[0];
 if(tag&&String(node.tag||"").toLowerCase()!==tag.toLowerCase())return false;
 const want=(compound.match(/\.[\w-]+/g)||[]).map(one=>one.slice(1).toLowerCase());
 const have=(node.classes||[]).map(one=>String(one).toLowerCase());
 return want.every(one=>have.includes(one));
}
