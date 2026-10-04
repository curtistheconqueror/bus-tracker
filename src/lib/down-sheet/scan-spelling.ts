/* Correcting what the camera misread, without inventing anything.

   A photographed sheet came back saying FRONT TIROS/COOLANT LEAK. "Tiros" is
   not a word, "tires" is, and the word before it is "front" — a person reads
   that without pausing. The scan had no way to.

   The rule here is deliberately timid, because a spell-corrector let loose on a
   maintenance sheet is a good way to turn a real part number into a plausible
   wrong one:

     - Only words the shop vocabulary does NOT already contain are touched. A
       word that is already right is never "improved".
     - Only when exactly ONE vocabulary word is within reach. Two candidates
       means the guess is a coin toss, and it is left alone.
     - Nothing containing a digit is touched at all. Bus numbers, service codes
       and part numbers are the things that must never be helpfully altered.
     - Short words are left alone. At three letters almost everything is one
       edit from something else.
     - The original casing is kept, so TIROS becomes TIRES and not Tires.

   The reviewer still sees every row and can edit any field, so this only has to
   be right more often than it is wrong on the words it does touch. */

/* Words the shop actually writes. Not a dictionary — an English dictionary
   would happily "correct" a mechanic's shorthand into prose. */
const SHOP_WORDS=[
 "tires","tire","brakes","brake","engine","transmission","trans","coolant","leak","leaking",
 "misfire","misfires","differential","compressor","alternator","starter","battery","radiator",
 "steering","suspension","exhaust","injector","injectors","turbo","clutch","bearing","bushing",
 "windshield","wiper","wipers","mirror","mirrors","heater","blower","condenser","evaporator",
 "kneeler","ramp","chain","chains","farebox","destination","multiplex","harness","sensor","solenoid","governor",
 "dryer","dryers","valve","valves","gasket","hose","hoses","belt","belts","pulley","filter",
 "shock","shocks","spring","springs","axle","hub","seal","seals","pump","fitting","bracket",
 "accident","damage","damaged","inspection","overheats","overheating","pressure","grinding",
 "shaking","shakes","roaring","rattle","vibration","stalling","cranking","charging","shifting",
 "hazmat","biohazard","quarantine","towed","roadcall","repaired","replaced","broken","loose",
 "front","rear","driver","passenger","interior","exterior","cabin","wheelchair","securement",
];

const CORE=new Set(SHOP_WORDS);

/* Damerau-Levenshtein rather than plain Levenshtein, because a swapped pair of
   letters is the single most common way both handwriting and OCR go wrong —
   CHIAN for CHAIN — and plain Levenshtein scores that 2, putting it out of reach
   for a five-letter word. Counting a swap as one edit is what catches it.
   The strings here are single words, so the cost of being unclever is nothing. */
function editDistanceWithin(a:string,b:string,limit:number){
 if(Math.abs(a.length-b.length)>limit)return false;
 let twoBack:number[]=[];
 let previous=Array.from({length:b.length+1},(_,index)=>index);
 for(let i=1;i<=a.length;i++){
  const current=[i];
  for(let j=1;j<=b.length;j++){
   current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
   if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])current[j]=Math.min(current[j],twoBack[j-2]+1);
  }
  twoBack=previous;previous=current;
 }
 return previous[b.length]<=limit;
}

function matchCase(original:string,corrected:string){
 if(original===original.toUpperCase())return corrected.toUpperCase();
 if(original[0]===original[0].toUpperCase())return corrected[0].toUpperCase()+corrected.slice(1);
 return corrected;
}

/* `extra` carries names the shop uses that no fixed list can know — the
   mechanics already written on earlier sheets. That is what turns CAROS back
   into CARLOS, which a shop-terms list alone never could. */
export function correctScannedText(text:string,extra:string[]=[]):string{
 if(!text)return text;
 const vocabulary=new Set([...CORE,...extra.map(word=>word.toLowerCase().trim()).filter(word=>word.length>=4)]);
 return text.replace(/[A-Za-z]+/g,word=>{
  const lower=word.toLowerCase();
  if(word.length<4||vocabulary.has(lower))return word;
  /* One edit for a short word, two once it is long enough that two edits still
     leave it recognisable. */
  const limit=word.length>=7?2:1;
  const hits=[...vocabulary].filter(candidate=>editDistanceWithin(lower,candidate,limit));
  return hits.length===1?matchCase(word,hits[0]):word;
 });
}

/* The mechanics this shop has actually written down, gathered from whatever
   entries the device already holds. Names only — anything with a digit in it is
   not a person. */
export function knownMechanicNames(entries:{assignedTo?:string}[]):string[]{
 const names=new Set<string>();
 for(const entry of entries)
  for(const part of String(entry?.assignedTo??"").split(/[\/,&]|\band\b/i)){
   const name=part.trim();
   if(name.length>=4&&!/\d/.test(name))names.add(name.toLowerCase());
  }
 return [...names];
}
