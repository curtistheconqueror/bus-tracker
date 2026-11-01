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
  if(/^-?[\d.]+(px|rem|em|pt|%)$/i.test(size))return size;
 }
 return "";
}

/* Only units that resolve to a fixed px here. A `clamp()`, a `var()` or a
   viewport unit cannot be answered by reading one file, so they come back null
   and the caller treats them as unknown rather than as safe. */
function toPx(value,rootPx){
 const match=String(value).trim().match(/^(-?[\d.]+)(px|rem|em|pt|%)$/i);
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
