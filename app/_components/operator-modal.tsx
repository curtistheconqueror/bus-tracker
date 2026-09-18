"use client";
import {useEffect,useRef,useState} from "react";
import type {OperatorPlan,OperatorPlanningResult,OperatorSelectionContext} from "@/src/lib/operator/operator-engine";

type Message={id:number;role:"operator"|"assistant";text:string;success?:boolean};

export default function OperatorModal({close,plan,execute,openDownSheet}:{close:()=>void;plan:(command:string,context:OperatorSelectionContext|null)=>OperatorPlanningResult;execute:(plan:OperatorPlan)=>{ok:boolean;message:string};openDownSheet:()=>void}){
 const [command,setCommand]=useState(""),[pending,setPending]=useState<OperatorPlan|null>(null),[selection,setSelection]=useState<OperatorSelectionContext|null>(null),[messages,setMessages]=useState<Message[]>([{id:1,role:"assistant",text:"Operator ready. I can answer live fleet questions, remember groups, inspect and locate buses, move multiple buses, update statuses, manage the down sheet, and preview every change before applying it."}]);
 const endRef=useRef<HTMLDivElement>(null),nextId=useRef(2);
 useEffect(()=>{endRef.current?.scrollIntoView({block:"nearest"})},[messages,pending]);
 const add=(role:Message["role"],text:string,success?:boolean)=>setMessages(current=>[...current,{id:nextId.current++,role,text,success}]);
 /* WHAT THE NEXT TURN INHERITS.

    This used to remember a GROUP and only from an `analysis` plan, which is why
    "Does bus 17559 ... ?" then "Why?" lost the subject: a single-bus answer
    recorded nothing at all. Every plan that names one bus now leaves it behind,
    so a pronoun or a bare follow-up has something to resolve against. */
 const remember=(next:OperatorPlan)=>{
  if(next.kind==="analysis"){setSelection(next.busIds.length?{busIds:next.busIds,busNumbers:next.busNumbers,label:next.selectionLabel}:null);return}
  if(next.kind==="locate"&&next.busIds.length===1){setSelection({busIds:next.busIds,busNumbers:next.busNumbers,label:"Bus "+next.busNumbers[0],lastBusId:next.busIds[0],lastBusNumber:next.busNumbers[0]});return}
  if("busId" in next&&next.busId)setSelection({busIds:[next.busId],busNumbers:[next.busNumber],label:"Bus "+next.busNumber,lastBusId:next.busId,lastBusNumber:next.busNumber});
 };
 const submit=(event:React.FormEvent)=>{event.preventDefault();const value=command.trim();if(!value)return;add("operator",value);setCommand("");const result=plan(value,selection);if(result.kind==="message"){if(result.context)setSelection(result.context);add("assistant",result.message,false);return}if(result.plan.requiresConfirmation){setPending(result.plan);add("assistant","I prepared this change. Review it below and press APPLY CHANGE to continue.");return}const outcome=execute(result.plan);if(outcome.ok)remember(result.plan);add("assistant",outcome.message,outcome.ok)};
 /* Applying a change used to blank the whole context. That is right for a
    GROUP — "move those" has been carried out and the group is spent — but
    wrong for the subject: having just moved Bus 17559, "why is it there?" is
    the most natural next thing anybody says. The group half is cleared, the
    bus half is kept. */
 const apply=()=>{
  if(!pending)return;
  const outcome=execute(pending);
  if(outcome.ok)setSelection(current=>{
   const busId=("busId" in pending&&pending.busId)||current?.lastBusId||"";
   const busNumber=("busNumber" in pending&&pending.busNumber)||current?.lastBusNumber||"";
   return busId?{busIds:[busId],busNumbers:[busNumber],label:"Bus "+busNumber,lastBusId:busId,lastBusNumber:busNumber}:null;
  });
  setPending(null);
  add("assistant",outcome.message,outcome.ok);
 };
 const quick=(value:string)=>{setCommand(value);requestAnimationFrame(()=>document.querySelector<HTMLInputElement>(".operator-compose input")?.focus())};
 return <div className="shade operator-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><section className="operator-modal" role="dialog" aria-modal="true" aria-labelledby="operator-title"><header className="operator-head"><span className="operator-mark" aria-hidden="true">✦</span><span><small>FLEET INTELLIGENT COMMAND CONSOLE</small><h2 id="operator-title">AI Operator</h2></span><b>DEVICE-LOCAL FLEET INTELLIGENCE</b><button type="button" onClick={close} aria-label="Close AI Operator">×</button></header><div className="operator-boundary"><b>LOCAL SESSION</b><span>Answers use this device’s live tracker and down sheet. Fleet groups remain available for one conversational follow-up action.</span></div>{selection&&<div className="operator-memory"><span><b>REMEMBERED GROUP</b>{selection.label} · {selection.busIds.length} bus{selection.busIds.length===1?"":"es"}</span><button type="button" onClick={()=>setSelection(null)}>CLEAR</button></div>}<div className="operator-messages" role="log" aria-live="polite">{messages.map(message=><article className={message.role+(message.success===false?" warning":"")+(message.success===true?" success":"")} key={message.id}><b>{message.role==="operator"?"YOU":"AI OPERATOR"}</b><p>{message.text}</p></article>)}{pending&&<section className="operator-preview"><span><b>CHANGE PREVIEW</b><p>{pending.summary}</p></span><div><button type="button" onClick={()=>{setPending(null);add("assistant","Change canceled. Nothing was updated.")}}>CANCEL</button><button className="operator-apply" type="button" onClick={apply}>APPLY CHANGE</button></div></section>}<div ref={endRef}/></div><div className="operator-quick"><b>TRY A FLEET QUESTION OR COMMAND</b><div><button type="button" onClick={()=>quick("How many duplicates do we have?")}>Count duplicates</button><button type="button" onClick={()=>quick("How many buses have been sitting for 8+ hours?")}>Sitting 8+ hours</button><button type="button" onClick={()=>quick("Show the 5 longest unmoved buses")}>Longest unmoved</button><button type="button" onClick={()=>quick("Locate bus 25")}>Locate bus 25</button><button type="button" onClick={()=>quick("Move bus 25 to CNG East")}>Move a bus</button><button type="button" onClick={()=>quick("Move all buses in CNG West to the Waiting Area")}>Move an area</button><button type="button" onClick={()=>quick("How many buses are in the Waiting Area?")}>Waiting count</button><button type="button" onClick={()=>quick("Add bus 25 to the down sheet")}>Add to down sheet</button><button type="button" onClick={()=>quick("Clear the entire down sheet")}>Clear down sheet</button></div></div><form className="operator-compose" onSubmit={submit}><label><span>QUESTION OR COMMAND</span><input autoFocus value={command} onChange={event=>setCommand(event.target.value)} placeholder="Ask about the fleet or enter a command" disabled={Boolean(pending)}/></label><button type="submit" disabled={!command.trim()||Boolean(pending)}><span aria-hidden="true">✦</span> ASK / PREVIEW</button></form><footer className="operator-foot"><span>Fleet questions run immediately. Every change still requires confirmation. Ambiguous short bus numbers require clarification.</span><button type="button" onClick={openDownSheet}>OPEN DOWN SHEET</button></footer></section></div>;
}
