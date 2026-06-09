import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "./supabase";

// ─── Seed ─────────────────────────────────────────────────────────────────────
const SEED = [];

const CATS = {
  "Rent":               { color:"#FF6B6B", icon:"🏠" },
  "Food & Dining":      { color:"#E8654A", icon:"🍜" },
  "Transportation":     { color:"#4A90D9", icon:"🚌" },
  "Fitness & Wellness": { color:"#52C47C", icon:"🏋️" },
  "Groceries":          { color:"#F5A623", icon:"🛒" },
  "Shopping":           { color:"#B06DD4", icon:"🛍️" },
  "Entertainment":      { color:"#E8A838", icon:"🎭" },
  "Subscriptions":      { color:"#7B8FD4", icon:"📱" },
  "Health & Beauty":    { color:"#F46B8E", icon:"💊" },
  "Travel":             { color:"#4ABBD9", icon:"✈️" },
};

const TRIP_EMOJIS  = ["🌴","🗺️","🏖️","🗼","🌎","🏔️","🌊","🎡","🧳","✈️","🍣","🎭","🎿","🏝️","🚢"];
const TRIP_COLORS  = ["#4ABBD9","#52C47C","#E8A838","#B06DD4","#F46B8E","#4A90D9","#E8654A","#7B8FD4","#F5A623","#FF6B6B","#52C47C","#4ABBD9","#E8A838","#B06DD4","#F46B8E"];
const MONTHS       = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const INCOME       = 4906;
const CARD_COLORS  = { PC:"#cc2244", Scotia:"#d4372a", Amex:"#2d6bb5", "Bank Transfer":"#777", Cash:"#888" };

function calcEffective(t) {
  let a = t.amount;
  if (t.insuranceCovered) a = a * (1 - t.insurancePct / 100);
  if (t.isShared) a = a * (t.splitPct / 100);
  return Math.round(a * 100) / 100;
}

let _nid = 60;
const uid = () => _nid++;

// ─── Shared UI primitives ─────────────────────────────────────────────────────
const L = { display:"block", fontSize:10, color:"#666", fontFamily:"monospace", letterSpacing:1, marginBottom:5, textTransform:"uppercase" };
const I = { width:"100%", background:"#0e0e20", border:"1px solid #2a2a4a", borderRadius:10, padding:"11px 13px", color:"#e8e8f0", fontSize:14, fontFamily:"inherit", marginBottom:12, outline:"none" };

function Toggle({ on, onToggle, color="#6060ee" }) {
  return (
    <div onClick={() => onToggle(!on)} style={{ width:42, height:24, borderRadius:12, cursor:"pointer", position:"relative", flexShrink:0, transition:"background 0.2s", background: on ? color : "#22224a" }}>
      <div style={{ position:"absolute", top:3, left: on ? 21 : 3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s" }} />
    </div>
  );
}

function Sheet({ onClose, title, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#16162e", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:500, padding:"20px 20px 40px", maxHeight:"92vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, background:"#33335a", borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ fontSize:16, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CatPicker({ value, onChange, cats=CATS, onAddCat }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🐾");
  const [newColor, setNewColor] = useState("#F5A623");
  const CAT_COLORS = ["#FF6B6B","#E8654A","#4A90D9","#52C47C","#F5A623","#B06DD4","#E8A838","#7B8FD4","#F46B8E","#4ABBD9","#888"];
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
      {Object.keys(cats).map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ padding:"6px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", background: value===c ? cats[c].color : "#22224a", color: value===c ? "#fff" : "#666", transition:"all 0.15s" }}>
          {cats[c].icon} {c}
        </button>
      ))}
      {onAddCat && !adding && (
        <button onClick={() => setAdding(true)} style={{ padding:"6px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"1px dashed #33335a", background:"none", color:"#555" }}>
          + New
        </button>
      )}
      {onAddCat && adding && (
        <div style={{ width:"100%", background:"#0e0e20", border:"1px solid #2a2a4a", borderRadius:10, padding:"10px 12px", marginTop:4 }}>
          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
            <input value={newEmoji} onChange={e=>setNewEmoji(e.target.value)} style={{...I, width:52, marginBottom:0, textAlign:"center", padding:"8px 6px"}} maxLength={2} />
            <input value={newName} onChange={e=>setNewName(e.target.value)} style={{...I, flex:1, marginBottom:0}} placeholder="Category name" autoFocus />
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
            {CAT_COLORS.map(c=>(
              <div key={c} onClick={()=>setNewColor(c)} style={{ width:22, height:22, borderRadius:11, background:c, cursor:"pointer", outline:newColor===c?"3px solid #fff":"none", outlineOffset:2 }} />
            ))}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>{ if(newName.trim()){ onAddCat(newName.trim(), newEmoji, newColor); onChange(newName.trim()); setAdding(false); setNewName(""); setNewEmoji("🐾"); }}}
              style={{ flex:1, background:"#6060ee", color:"#fff", border:"none", borderRadius:8, padding:"8px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Add</button>
            <button onClick={()=>{setAdding(false);setNewName("");}}
              style={{ background:"none", border:"1px solid #33335a", color:"#888", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TripPicker({ value, onChange, trips, tripMeta }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
      <button onClick={() => onChange("")} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:`1px solid ${value===""?"#555":"#22224a"}`, background: value==="" ? "#22224a" : "none", color: value==="" ? "#aaa" : "#555" }}>
        — No trip
      </button>
      {trips.map(name => {
        const m = tripMeta[name] || {};
        return (
          <button key={name} onClick={() => onChange(name)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", background: value===name ? (m.color||"#4ABBD9") : "#22224a", color: value===name ? "#fff" : "#668" }}>
            {m.emoji||"✈️"} {name}
          </button>
        );
      })}
    </div>
  );
}

// ─── Edit Transaction Sheet ───────────────────────────────────────────────────
function EditSheet({ tx, trips, tripMeta, cats, onAddCat, onSave, onDelete, onClose }) {
  const [f, setF] = useState({ ...tx });
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  const eff = calcEffective(f);

  return (
    <Sheet onClose={onClose} title="Edit Transaction">
      <label style={L}>Description</label>
      <input value={f.desc} onChange={e=>set("desc",e.target.value)} style={I} />
      <label style={L}>Original Amount ($)</label>
      <input type="number" value={f.amount} onChange={e=>set("amount",parseFloat(e.target.value)||0)} style={I} />
      <label style={L}>Category</label>
      <CatPicker value={f.cat} onChange={v=>set("cat",v)} cats={cats} onAddCat={onAddCat} />

      {/* Travel + trip */}
      {f.isTravel && (
        <div style={{ background:"#0e1825", border:"1px solid #1a3a5a", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:13, color:"#4ABBD9", fontWeight:600 }}>✈️ Travel expense</span>
            <button
              onClick={() => setF(p => ({ ...p, isTravel:false, tripName:"" }))}
              style={{ background:"#1e1e38", border:"1px solid #33335a", color:"#e8e8f0", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              ✕ Move to Regular
            </button>
          </div>
          <label style={L}>Assign to trip</label>
          <TripPicker value={f.tripName} onChange={v=>set("tripName",v)} trips={trips} tripMeta={tripMeta} />
          <input value={f.tripName} onChange={e=>set("tripName",e.target.value)} style={{...I, marginTop:6, marginBottom:0}} placeholder="Or type a new trip name…" />
        </div>
      )}
      {!f.isTravel && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <Toggle on={false} onToggle={()=>setF(p=>({...p, isTravel:true}))} color="#4ABBD9" />
          <span style={{ fontSize:13, color:"#666" }}>✈️ Mark as travel expense</span>
        </div>
      )}

      {/* Insurance */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:f.insuranceCovered?8:14 }}>
        <Toggle on={f.insuranceCovered} onToggle={v=>set("insuranceCovered",v)} color="#52C47C" />
        <span style={{ fontSize:13, color:f.insuranceCovered?"#52C47C":"#666" }}>🏥 Insurance covered</span>
      </div>
      {f.insuranceCovered && (
        <div style={{ paddingLeft:4, marginBottom:14 }}>
          <label style={L}>Covers <b style={{color:"#52C47C"}}>{f.insurancePct}%</b></label>
          <input type="range" min={0} max={100} value={f.insurancePct} onChange={e=>set("insurancePct",parseInt(e.target.value))} style={{ width:"100%", accentColor:"#52C47C" }} />
        </div>
      )}

      {/* Shared */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:f.isShared?8:14 }}>
        <Toggle on={f.isShared} onToggle={v=>set("isShared",v)} color="#E8A838" />
        <span style={{ fontSize:13, color:f.isShared?"#E8A838":"#666" }}>👥 Shared expense</span>
      </div>
      {f.isShared && (
        <div style={{ paddingLeft:4, marginBottom:14 }}>
          <label style={L}>Shared with</label>
          <input value={f.sharedWith} onChange={e=>set("sharedWith",e.target.value)} style={I} placeholder="Name(s)" />
          <label style={L}>You pay <b style={{color:"#E8A838"}}>{f.splitPct}%</b></label>
          <input type="range" min={1} max={100} value={f.splitPct} onChange={e=>set("splitPct",parseInt(e.target.value))} style={{ width:"100%", accentColor:"#E8A838" }} />
        </div>
      )}

      <label style={L}>Note</label>
      <input value={f.note} onChange={e=>set("note",e.target.value)} style={I} placeholder="Optional…" />

      {/* Effective cost */}
      <div style={{ background:"#0e0e20", borderRadius:10, padding:"12px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"#666" }}>Your effective cost</span>
        <div style={{ textAlign:"right" }}>
          {eff!==f.amount && <p style={{ fontSize:11, color:"#555", textDecoration:"line-through", fontFamily:"monospace" }}>${f.amount.toFixed(2)}</p>}
          <p style={{ fontSize:18, fontWeight:700, color:"#52C47C", fontFamily:"monospace" }}>${eff.toFixed(2)}</p>
          {(f.insuranceCovered||f.isShared) && <p style={{ fontSize:10, color:"#555" }}>{f.insuranceCovered&&`${f.insurancePct}% ins.`}{f.insuranceCovered&&f.isShared&&" · "}{f.isShared&&`${f.splitPct}% share`}</p>}
        </div>
      </div>

      <button onClick={() => onSave({...f, effectiveAmount:eff})} style={{ width:"100%", background:"#6060ee", color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:10 }}>Save Changes</button>
      <button onClick={() => onDelete(tx.id)} style={{ width:"100%", background:"none", color:"#ff6060", border:"1px solid #5a2020", borderRadius:12, padding:"12px", fontSize:13, cursor:"pointer" }}>Delete Transaction</button>
    </Sheet>
  );
}

// ─── Add Transaction Sheet ────────────────────────────────────────────────────
function AddSheet({ trips, tripMeta, cats, onAddCat, onSave, onClose, onUpload }) {
  const [f,setF] = useState({ desc:"", amount:"", cat:"Food & Dining", month:"May", card:"Amex", note:"", insuranceCovered:false, insurancePct:0, isShared:false, sharedWith:"", splitPct:100, isTravel:false, tripName:"" });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const amt = parseFloat(f.amount)||0;
  const eff = calcEffective({...f, amount:amt});
  const mo  = MONTHS[new Date().getMonth()];
  const day = new Date().getDate();

  return (
    <Sheet onClose={onClose} title="Add Transaction">
      {onUpload && (
        <button onClick={()=>{onClose();onUpload();}} style={{ width:"100%", background:"#0e1825", border:"1px solid #1a3a5a", borderRadius:12, padding:"13px", fontSize:13, fontWeight:600, color:"#4ABBD9", cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          📄 Upload PDF Statement instead
        </button>
      )}
      <label style={L}>Description</label>
      <input value={f.desc} onChange={e=>set("desc",e.target.value)} style={I} placeholder="e.g. Dinner at Eataly" />
      <label style={L}>Amount ($)</label>
      <input type="number" value={f.amount} onChange={e=>set("amount",e.target.value)} style={I} placeholder="0.00" />
      <label style={L}>Category</label>
      <CatPicker value={f.cat} onChange={v=>set("cat",v)} cats={cats} onAddCat={onAddCat} />
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <div style={{flex:1}}>
          <label style={L}>Month</label>
          <select value={f.month} onChange={e=>set("month",e.target.value)} style={{...I,marginBottom:0}}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select>
        </div>
        <div style={{flex:1}}>
          <label style={L}>Card</label>
          <select value={f.card} onChange={e=>set("card",e.target.value)} style={{...I,marginBottom:0}}>{["PC","Scotia","Amex","Bank Transfer","Cash"].map(c=><option key={c}>{c}</option>)}</select>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:f.isTravel?8:12 }}>
        <Toggle on={f.isTravel} onToggle={v=>set("isTravel",v)} color="#4ABBD9" />
        <span style={{ fontSize:13, color:f.isTravel?"#4ABBD9":"#666" }}>✈️ Travel expense</span>
      </div>
      {f.isTravel && (
        <div style={{ paddingLeft:4, marginBottom:14 }}>
          <label style={L}>Assign to trip</label>
          <TripPicker value={f.tripName} onChange={v=>set("tripName",v)} trips={trips} tripMeta={tripMeta} />
          <input value={f.tripName} onChange={e=>set("tripName",e.target.value)} style={{...I,marginTop:6,marginBottom:0}} placeholder="Or type a new trip name…" />
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:f.insuranceCovered?8:12 }}>
        <Toggle on={f.insuranceCovered} onToggle={v=>set("insuranceCovered",v)} color="#52C47C" />
        <span style={{ fontSize:13, color:f.insuranceCovered?"#52C47C":"#666" }}>🏥 Insurance covered</span>
      </div>
      {f.insuranceCovered && (
        <div style={{ paddingLeft:4, marginBottom:12 }}>
          <label style={L}>Covers <b style={{color:"#52C47C"}}>{f.insurancePct}%</b></label>
          <input type="range" min={0} max={100} value={f.insurancePct} onChange={e=>set("insurancePct",parseInt(e.target.value))} style={{ width:"100%", accentColor:"#52C47C" }} />
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:f.isShared?8:12 }}>
        <Toggle on={f.isShared} onToggle={v=>set("isShared",v)} color="#E8A838" />
        <span style={{ fontSize:13, color:f.isShared?"#E8A838":"#666" }}>👥 Shared expense</span>
      </div>
      {f.isShared && (
        <div style={{ paddingLeft:4, marginBottom:12 }}>
          <label style={L}>Shared with</label>
          <input value={f.sharedWith} onChange={e=>set("sharedWith",e.target.value)} style={I} placeholder="Name(s)" />
          <label style={L}>You pay <b style={{color:"#E8A838"}}>{f.splitPct}%</b></label>
          <input type="range" min={1} max={100} value={f.splitPct} onChange={e=>set("splitPct",parseInt(e.target.value))} style={{ width:"100%", accentColor:"#E8A838" }} />
        </div>
      )}

      <label style={L}>Note</label>
      <input value={f.note} onChange={e=>set("note",e.target.value)} style={I} placeholder="Optional…" />
      {amt > 0 && (
        <div style={{ background:"#0e0e20", borderRadius:10, padding:"12px 14px", marginBottom:14, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"#666" }}>Your effective cost</span>
          <div style={{ textAlign:"right" }}>
            {eff!==amt && <p style={{ fontSize:11, color:"#555", textDecoration:"line-through", fontFamily:"monospace" }}>${amt.toFixed(2)}</p>}
            <p style={{ fontSize:18, fontWeight:700, color:"#52C47C", fontFamily:"monospace" }}>${eff.toFixed(2)}</p>
          </div>
        </div>
      )}
      <button disabled={!f.desc||!amt} onClick={()=>onSave({id:uid(), date:`${f.month} ${day}`, ...f, amount:amt, effectiveAmount:eff})}
        style={{ width:"100%", border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700, cursor:f.desc&&amt?"pointer":"not-allowed", background:f.desc&&amt?"#6060ee":"#22224a", color:f.desc&&amt?"#fff":"#555" }}>
        Add Transaction
      </button>
    </Sheet>
  );
}

// ─── Upload Sheet ─────────────────────────────────────────────────────────────
function UploadSheet({ trips, tripMeta, onAdd, onClose }) {
  const [stage,setStage]   = useState("idle");
  const [parsed,setParsed] = useState([]);
  const [sel,setSel]       = useState(new Set());
  const [fileName,setFileName] = useState("");
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name); setStage("reading");
    const b64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
    setStage("parsing");
    try {
      const resp = await fetch("/api/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:4000,
          messages:[{ role:"user", content:[
            { type:"document", source:{ type:"base64", media_type:"application/pdf", data:b64 } },
            { type:"text", text:`Extract all purchase transactions from this statement. Return ONLY a JSON array, no markdown.
Each item: {"date":"Mon DD","desc":"merchant name","amount":number,"month":"Jan/Feb/etc","card":"PC or Scotia or Amex","cat":"one of: Food & Dining,Groceries,Transportation,Shopping,Entertainment,Subscriptions,Health & Beauty,Fitness & Wellness,Rent,Travel","isTravel":boolean,"tripName":"short trip name if travel, else empty string","note":""}
For tripName: group obvious travel clusters (e.g. Miami transactions → 'Feb Florida', Disney → 'Feb Florida', Brazil flight → 'May Brazil'). Leave empty if not travel.` }
          ]}]
        })
      });
      const data  = await resp.json();
      const text  = data.content.find(b=>b.type==="text")?.text||"[]";
      const rows  = JSON.parse(text.replace(/```json|```/g,"").trim());
      const withIds = rows.map(r => ({ id:uid(), effectiveAmount:r.amount, insuranceCovered:false, insurancePct:0, isShared:false, sharedWith:"", splitPct:100, ...r }));
      setParsed(withIds); setSel(new Set(withIds.map(r=>r.id))); setStage("review");
    } catch(e) { console.error(e); setStage("error"); }
  }

  function toggleSel(id) { setSel(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; }); }

  return (
    <Sheet onClose={onClose} title="Upload Statement">
      {stage==="idle" && (<>
        <div onClick={()=>fileRef.current.click()} style={{ border:"2px dashed #33335a", borderRadius:14, padding:"36px 20px", textAlign:"center", cursor:"pointer", marginBottom:14 }}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}>
          <p style={{ fontSize:36, marginBottom:10 }}>📄</p>
          <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Drop your PDF statement here</p>
          <p style={{ fontSize:12, color:"#555" }}>or tap to browse · PC Financial, Scotiabank, Amex</p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
        <div style={{ background:"#0e0e20", borderRadius:10, padding:"12px 14px" }}>
          <p style={{ fontSize:12, color:"#52C47C", fontWeight:600, marginBottom:4 }}>✨ AI-powered extraction</p>
          <p style={{ fontSize:12, color:"#666", lineHeight:1.6 }}>Claude reads your statement, extracts every transaction, auto-categorizes and groups travel into trips. Review everything before importing.</p>
        </div>
      </>)}

      {(stage==="reading"||stage==="parsing") && (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <p style={{ fontSize:48, marginBottom:16 }}>{stage==="reading"?"📄":"🤖"}</p>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{stage==="reading"?"Reading PDF…":"AI extracting transactions…"}</p>
          <p style={{ fontSize:12, color:"#555" }}>{fileName}</p>
        </div>
      )}

      {stage==="error" && (
        <div style={{ textAlign:"center", padding:"30px 20px" }}>
          <p style={{ fontSize:36, marginBottom:12 }}>⚠️</p>
          <p style={{ fontSize:14, color:"#ff8080", fontWeight:600, marginBottom:8 }}>Couldn't parse the statement</p>
          <button onClick={()=>setStage("idle")} style={{ background:"#22224a", border:"none", color:"#e8e8f0", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontFamily:"inherit" }}>Try again</button>
        </div>
      )}

      {stage==="review" && (<>
        <div style={{ background:"#0d1e14", border:"1px solid #1a4a2a", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
          <p style={{ fontSize:12, color:"#52C47C", fontWeight:600, marginBottom:2 }}>✓ Extracted {parsed.length} transactions</p>
          <p style={{ fontSize:11, color:"#668" }}>Trip names are AI guesses — you can fix them in the Trip Manager after import.</p>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <p style={{ fontSize:12, color:"#888" }}>{sel.size} of {parsed.length} selected</p>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={()=>setSel(new Set(parsed.map(r=>r.id)))} style={{ fontSize:11, background:"none", border:"1px solid #33335a", color:"#888", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>All</button>
            <button onClick={()=>setSel(new Set())} style={{ fontSize:11, background:"none", border:"1px solid #33335a", color:"#888", borderRadius:8, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>None</button>
          </div>
        </div>
        <div style={{ maxHeight:320, overflowY:"auto", marginBottom:12 }}>
          {parsed.map(row => {
            const on = sel.has(row.id);
            return (
              <div key={row.id} onClick={()=>toggleSel(row.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, background:on?"#16162e":"#0a0a18", marginBottom:3, cursor:"pointer", border:`1px solid ${on?"#33335a":"#1a1a2e"}`, opacity:on?1:0.45 }}>
                <div style={{ width:18, height:18, borderRadius:5, border:"2px solid", borderColor:on?"#6060ee":"#33335a", background:on?"#6060ee":"none", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {on && <span style={{ color:"#fff", fontSize:11 }}>✓</span>}
                </div>
                <span style={{ fontSize:16 }}>{CATS[row.cat]?.icon||"•"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{row.desc}</p>
                  <p style={{ fontSize:10, color:"#555" }}>{row.date} · <span style={{ color:CATS[row.cat]?.color||"#888" }}>{row.cat}</span>{row.tripName && <span style={{ color:"#4ABBD9" }}> · ✈️ {row.tripName}</span>}</p>
                </div>
                <p style={{ fontFamily:"monospace", fontSize:13, fontWeight:600, color:CATS[row.cat]?.color||"#e8e8f0", flexShrink:0 }}>${row.amount.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
        <div style={{ background:"#0e0e20", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"#666" }}>Selected total</span>
          <span style={{ fontFamily:"monospace", fontWeight:700, color:"#6060ee" }}>${parsed.filter(r=>sel.has(r.id)).reduce((s,r)=>s+r.amount,0).toFixed(2)}</span>
        </div>
        <button onClick={()=>{onAdd(parsed.filter(r=>sel.has(r.id)));onClose();}} disabled={sel.size===0}
          style={{ width:"100%", background:sel.size>0?"#6060ee":"#22224a", color:sel.size>0?"#fff":"#555", border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700, cursor:sel.size>0?"pointer":"not-allowed" }}>
          Import {sel.size} transaction{sel.size!==1?"s":""}
        </button>
      </>)}
    </Sheet>
  );
}

// ─── Trip Manager Screen ──────────────────────────────────────────────────────
function TripManager({ txs, trips, tripMeta, onRenameTrip, onDeleteTrip, onCreateTrip, onBulkAssign, onUpdateTripMeta, onBack }) {
  const [activeTrip, setActiveTrip] = useState(null); // null = list, else trip name
  const [renaming, setRenaming]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState(new Set());
  const [assignTarget, setAssignTarget] = useState("");
  const [creatingNew, setCreatingNew]   = useState(false);
  const [newTripName, setNewTripName]   = useState("");

  const travelTxs = txs.filter(t => t.isTravel);
  const tripTxs   = activeTrip ? travelTxs.filter(t => t.tripName===activeTrip) : [];
  const untagged  = travelTxs.filter(t => !t.tripName);

  const meta    = activeTrip ? (tripMeta[activeTrip]||{}) : {};
  const color   = meta.color || "#4ABBD9";
  const emoji   = meta.emoji || "✈️";
  const tripIdx = trips.indexOf(activeTrip);
  const allTripsWithUntagged = [...trips, untagged.length > 0 ? "__untagged" : null].filter(Boolean);

  function toggleSelect(id) {
    setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  }
  function doAssign() {
    if (assignTarget === "__regular") {
      // Remove travel flag entirely
      onBulkAssign([...selected], "__regular");
    } else {
      onBulkAssign([...selected], assignTarget==="__none" ? "" : assignTarget);
    }
    setSelected(new Set()); setSelectMode(false); setAssignTarget("");
  }

  // ── Trip list view ──
  if (!activeTrip) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid #33335a", color:"#888", cursor:"pointer", borderRadius:8, padding:"7px 12px", fontFamily:"inherit", fontSize:12 }}>← Back</button>
        <h2 style={{ fontSize:18, fontWeight:700 }}>Trip Manager</h2>
      </div>

      <div style={{ background:"#0d1522", border:"1px solid #1a3a5a", borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
        <p style={{ fontSize:12, color:"#4ABBD9", fontWeight:600, marginBottom:3 }}>✈️ Manage your trips</p>
        <p style={{ fontSize:12, color:"#556", lineHeight:1.6 }}>Rename trips, move transactions between trips, create new ones, or bulk-reassign after a statement upload.</p>
      </div>

      {/* Create new trip */}
      {creatingNew ? (
        <div style={{ background:"#14142a", border:"1px solid #22224a", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
          <label style={L}>New Trip Name</label>
          <input value={newTripName} onChange={e=>setNewTripName(e.target.value)} style={{...I,marginBottom:10}} placeholder="e.g. Aug Europe" autoFocus />
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{if(newTripName.trim()){onCreateTrip(newTripName.trim());setNewTripName("");setCreatingNew(false);}}}
              style={{ flex:1, background:"#6060ee", color:"#fff", border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Create</button>
            <button onClick={()=>{setCreatingNew(false);setNewTripName("");}}
              style={{ flex:1, background:"none", border:"1px solid #33335a", color:"#888", borderRadius:10, padding:"10px", fontSize:13, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setCreatingNew(true)} style={{ width:"100%", background:"none", border:"2px dashed #33335a", color:"#668", borderRadius:12, padding:"12px", fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:14 }}>
          + Create New Trip
        </button>
      )}

      {/* Trip list */}
      {trips.map((name,i) => {
        const m   = tripMeta[name]||{};
        const trs = travelTxs.filter(t=>t.tripName===name);
        const tot = trs.reduce((s,t)=>s+t.effectiveAmount,0);
        return (
          <div key={name} onClick={()=>setActiveTrip(name)} style={{ background:"#0e1822", border:"1px solid #1a3a5a", borderRadius:12, padding:"14px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24 }}>{m.emoji||TRIP_EMOJIS[i%TRIP_EMOJIS.length]}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:700 }}>{name}</p>
              <p style={{ fontSize:11, color:"#4a7a9a", marginTop:2 }}>{trs.length} transactions</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontFamily:"monospace", fontSize:15, fontWeight:700, color:m.color||TRIP_COLORS[i%TRIP_COLORS.length] }}>${Math.round(tot).toLocaleString()}</p>
              <p style={{ fontSize:10, color:"#4a7a9a" }}>tap to edit →</p>
            </div>
          </div>
        );
      })}

      {/* Untagged */}
      {untagged.length > 0 && (
        <div onClick={()=>setActiveTrip("__untagged")} style={{ background:"#141420", border:"1px dashed #33335a", borderRadius:12, padding:"14px 16px", marginBottom:8, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>🏷️</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:700, color:"#888" }}>Untagged Travel</p>
            <p style={{ fontSize:11, color:"#555", marginTop:2 }}>{untagged.length} transactions need a trip</p>
          </div>
          <span style={{ color:"#555" }}>→</span>
        </div>
      )}

      {trips.length===0 && untagged.length===0 && (
        <p style={{ color:"#555", textAlign:"center", padding:"30px 0", fontSize:13 }}>No travel transactions yet</p>
      )}
    </div>
  );

  // ── Single trip detail / edit ──
  const displayTxs = activeTrip==="__untagged" ? untagged : tripTxs;
  const displayName = activeTrip==="__untagged" ? "Untagged Travel" : activeTrip;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <button onClick={()=>{ setActiveTrip(null); setSelectMode(false); setSelected(new Set()); setRenaming(false); }}
          style={{ background:"none", border:"1px solid #33335a", color:"#888", cursor:"pointer", borderRadius:8, padding:"7px 12px", fontFamily:"inherit", fontSize:12 }}>← Trips</button>
        <div style={{ flex:1 }}>
          {renaming ? (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={newName} onChange={e=>setNewName(e.target.value)} autoFocus
                style={{...I, marginBottom:0, padding:"8px 12px", fontSize:14, flex:1}} placeholder="New trip name" />
              <button onClick={()=>{if(newName.trim()){onRenameTrip(activeTrip,newName.trim());setActiveTrip(newName.trim());setRenaming(false);}}}
                style={{ background:"#6060ee", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>Save</button>
              <button onClick={()=>setRenaming(false)} style={{ background:"none", border:"1px solid #33335a", color:"#888", borderRadius:8, padding:"8px 12px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <h2 style={{ fontSize:18, fontWeight:700, color: activeTrip==="__untagged"?"#888":color }}>{emoji} {displayName}</h2>
              {activeTrip!=="__untagged" && (
                <button onClick={()=>{setNewName(activeTrip);setRenaming(true);}} style={{ background:"none", border:"1px solid #33335a", color:"#888", borderRadius:6, padding:"3px 8px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>✏️ Rename</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emoji & color picker for non-untagged */}
      {activeTrip!=="__untagged" && (
        <div style={{ background:"#0e1822", border:"1px solid #1a3a5a", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
          <p style={{ fontSize:10, color:"#4a7a9a", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>ICON & COLOUR</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
            {TRIP_EMOJIS.map(e=>(
              <button key={e} onClick={()=>onUpdateTripMeta(activeTrip,{...meta,emoji:e})}
                style={{ fontSize:18, background:meta.emoji===e?"#22224a":"none", border:`1px solid ${meta.emoji===e?"#4ABBD9":"#1a3a5a"}`, borderRadius:8, padding:"4px 8px", cursor:"pointer" }}>{e}</button>
            ))}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {TRIP_COLORS.map(c=>(
              <div key={c} onClick={()=>onUpdateTripMeta(activeTrip,{...meta,color:c})}
                style={{ width:24, height:24, borderRadius:12, background:c, cursor:"pointer", outline: meta.color===c?"3px solid #fff":"none", outlineOffset:2 }} />
            ))}
          </div>
        </div>
      )}

      {/* Bulk tools */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={()=>{setSelectMode(!selectMode);setSelected(new Set());setAssignTarget("");}}
          style={{ flex:1, background:selectMode?"#2a2a5a":"none", border:`1px solid ${selectMode?"#6060ee":"#33335a"}`, color:selectMode?"#a0a0ff":"#888", borderRadius:10, padding:"9px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          {selectMode ? `${selected.size} selected` : "✦ Select to move"}
        </button>
        {selectMode && selected.size>0 && (
          <button onClick={()=>setSelected(new Set(displayTxs.map(t=>t.id)))}
            style={{ background:"none", border:"1px solid #33335a", color:"#888", borderRadius:10, padding:"9px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>All</button>
        )}
      </div>

      {/* Assign target when in select mode */}
      {selectMode && selected.size > 0 && (
        <div style={{ background:"#14142a", border:"1px solid #22224a", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
          <p style={{ fontSize:11, color:"#888", marginBottom:10 }}>Move {selected.size} transaction{selected.size!==1?"s":""}  to:</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            <button onClick={()=>setAssignTarget("__regular")} style={{ padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", background:assignTarget==="__regular"?"#52C47C":"#1a2a1a", color:assignTarget==="__regular"?"#fff":"#52C47C" }}>
              💳 Move to Regular
            </button>
            <button onClick={()=>setAssignTarget("__none")} style={{ padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", background:assignTarget==="__none"?"#555":"#22224a", color:assignTarget==="__none"?"#fff":"#666" }}>
              🏷️ Untagged Travel
            </button>
            {trips.filter(t=>t!==activeTrip).map((t,i)=>{
              const m=tripMeta[t]||{};
              return (
                <button key={t} onClick={()=>setAssignTarget(t)} style={{ padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", border:"none", background:assignTarget===t?(m.color||TRIP_COLORS[i%TRIP_COLORS.length]):"#22224a", color:assignTarget===t?"#fff":"#668" }}>
                  {m.emoji||TRIP_EMOJIS[i%TRIP_EMOJIS.length]} {t}
                </button>
              );
            })}
          </div>
          {assignTarget && (
            <button onClick={doAssign} style={{ width:"100%", background: assignTarget==="__regular" ? "#52C47C" : "#6060ee", color:"#fff", border:"none", borderRadius:10, padding:"10px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {assignTarget==="__regular" ? "Move to Regular Expenses →" : assignTarget==="__none" ? "Mark as Untagged Travel →" : `Move to ${assignTarget} →`}
            </button>
          )}
        </div>
      )}

      {/* Transaction list */}
      {displayTxs.length===0
        ? <p style={{ color:"#555", textAlign:"center", padding:"30px 0" }}>No transactions here</p>
        : displayTxs.map(t => {
          const isSel = selected.has(t.id);
          return (
            <div key={t.id} onClick={()=>selectMode ? toggleSelect(t.id) : null}
              style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 13px", borderRadius:10, marginBottom:4, cursor:selectMode?"pointer":"default", background:isSel?"#1a1a3a":"#0a1825", border:`1px solid ${isSel?"#6060ee":"transparent"}`, transition:"all 0.15s" }}>
              {selectMode && (
                <div style={{ width:20, height:20, borderRadius:5, border:"2px solid", borderColor:isSel?"#6060ee":"#33335a", background:isSel?"#6060ee":"none", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {isSel && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
                </div>
              )}
              <span style={{ fontSize:18, marginTop:1 }}>{CATS[t.cat]?.icon||"•"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.desc}</p>
                <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>{t.date}</span>
                  <span style={{ fontSize:10, padding:"1px 6px", borderRadius:10, background:`${(CARD_COLORS[t.card]||"#888")}22`, color:CARD_COLORS[t.card]||"#888" }}>{t.card}</span>
                  {t.isShared && <span style={{ fontSize:10, color:"#E8A838" }}>👥</span>}
                  {t.insuranceCovered && <span style={{ fontSize:10, color:"#52C47C" }}>🏥</span>}
                  {t.note && <span style={{ fontSize:10, color:"#556", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📝 {t.note}</span>}
                </div>
              </div>
              <p style={{ fontFamily:"monospace", fontSize:13, fontWeight:600, color:color, flexShrink:0 }}>${t.effectiveAmount.toFixed(2)}</p>
            </div>
          );
        })
      }

      {/* Delete trip (non-untagged) */}
      {activeTrip!=="__untagged" && (
        <button onClick={()=>{if(window.confirm?.(`Delete trip "${activeTrip}"? Transactions will become untagged.`)||true){onDeleteTrip(activeTrip);setActiveTrip(null);}}}
          style={{ width:"100%", background:"none", color:"#ff6060", border:"1px solid #5a2020", borderRadius:12, padding:"12px", fontSize:13, cursor:"pointer", marginTop:16 }}>
          Delete Trip "{activeTrip}"
        </button>
      )}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, cats=CATS }) {
  if (!active||!payload?.length) return null;
  const total = payload.reduce((s,p)=>s+(p.value||0),0);
  return (
    <div style={{ background:"#12122a", border:"1px solid #2d2d52", borderRadius:10, padding:"10px 14px", minWidth:160 }}>
      <p style={{ color:"#888", fontSize:11, marginBottom:6, fontFamily:"monospace" }}>{label}</p>
      {[...payload].reverse().filter(p=>p.value>0).map(p=>(
        <p key={p.name} style={{ color:p.fill, margin:"2px 0", fontSize:11 }}>{cats[p.name]?.icon||"✈️"} {p.name}: <b>${Math.round(p.value)}</b></p>
      ))}
      <p style={{ color:"#fff", borderTop:"1px solid #333", marginTop:5, paddingTop:5, fontSize:12, fontFamily:"monospace" }}>Total: ${Math.round(total).toLocaleString()}</p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [txs, setTxs]           = useState([]);
  const [tripMeta, setTripMeta] = useState({});
  const [loading, setLoading]   = useState(true);
  const [customCats, setCustomCats] = useState({});
  const allCats = { ...CATS, ...customCats };
  function addCategory(name, icon, color) { setCustomCats(c => ({...c, [name]:{icon, color}})); }

  const [editTx, setEditTx]     = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView]         = useState("dashboard"); // dashboard | list | trips | chat
  const [activeTab, setActiveTab] = useState("regular");
  const [filterCat, setFilterCat] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [tripFilter, setTripFilter] = useState(null);
  const [toast, setToast]       = useState(null);

  const [chatMsgs, setChatMsgs]   = useState([
    { role:"assistant", text:"Hi! I can add expenses for you. Try saying:\n• \"Paid mum $150 allowance\"\n• \"Split $80 dinner with Jake\"\n• \"Spent $45 at Freshco today\"\n• \"That Shoppers charge was 80% covered by insurance\"" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs, chatLoading]);

  // ── Load from Supabase on mount ──
  useEffect(() => {
    async function load() {
      const [{ data: txRows, error: txErr }, { data: metaRows }] = await Promise.all([
        supabase.from("transactions").select("id, data").order("id", { ascending: false }),
        supabase.from("trip_meta").select("*"),
      ]);
      const CAT_MAP = {
        food:"Food & Dining", groceries:"Groceries", transport:"Transportation",
        shopping:"Shopping", health:"Health & Beauty", entertainment:"Entertainment",
        travel:"Travel", bills:"Subscriptions", fitness:"Fitness & Wellness",
        pets:"Shopping", beauty:"Health & Beauty",
      };
      const MON_MAP = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun",
                       "07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec"};
      function normalize(row) {
        const d = row.data;
        // Already normalized
        if (d.month && d.desc) return { ...d, id: d.id ?? row.id };
        // Convert from legacy import format {date:"2026-05-01", note, cat key, trip}
        const [, mm, dd] = (d.date || "").split("-");
        const month = MON_MAP[mm] || "Jan";
        const day   = dd ? parseInt(dd) : 1;
        return {
          id:               d.id ?? row.id,
          date:             `${month} ${day}`,
          month,
          desc:             d.note || d.desc || "",
          amount:           d.amount || 0,
          effectiveAmount:  d.amount || 0,
          cat:              CAT_MAP[d.cat] || d.cat || "Shopping",
          card:             d.trip || d.card || "",
          isTravel:         d.isTravel || false,
          tripName:         d.tripName || "",
          note:             d.note2 || "",
          isShared:         false,
          sharedWith:       "",
          splitPct:         100,
          insuranceCovered: false,
          insurancePct:     0,
        };
      }
      if (txRows)   setTxs(txRows.map(normalize));
      if (metaRows) setTripMeta(Object.fromEntries(metaRows.map(r => [r.name, { color: r.color, emoji: r.emoji }])));
      setLoading(false);
    }
    load();
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),2200); }

  // ── Trip operations ──
  const trips = [...new Set(txs.filter(t=>t.isTravel&&t.tripName).map(t=>t.tripName))].sort();

  async function renameTrip(oldName, newName) {
    const updated = txs.filter(t => t.tripName===oldName).map(t => ({...t, tripName:newName}));
    setTxs(ts => ts.map(t => t.tripName===oldName ? {...t, tripName:newName} : t));
    const newMeta = { ...tripMeta };
    if (newMeta[oldName]) { newMeta[newName]=newMeta[oldName]; delete newMeta[oldName]; }
    setTripMeta(newMeta);
    await Promise.all([
      ...updated.map(t => supabase.from("transactions").update({ data: t }).eq("id", t.id)),
      supabase.from("trip_meta").delete().eq("name", oldName),
      newMeta[newName] && supabase.from("trip_meta").upsert({ name: newName, ...newMeta[newName] }),
    ]);
    showToast(`✓ Renamed to "${newName}"`);
  }
  async function deleteTrip(name) {
    const updated = txs.filter(t => t.tripName===name).map(t => ({...t, tripName:""}));
    setTxs(ts => ts.map(t => t.tripName===name ? {...t, tripName:""} : t));
    setTripMeta(m => { const n={...m}; delete n[name]; return n; });
    await Promise.all([
      ...updated.map(t => supabase.from("transactions").update({ data: t }).eq("id", t.id)),
      supabase.from("trip_meta").delete().eq("name", name),
    ]);
    showToast(`Deleted "${name}"`);
  }
  async function createTrip(name) {
    if (!tripMeta[name]) {
      const idx = trips.length;
      const meta = { color:TRIP_COLORS[idx%TRIP_COLORS.length], emoji:TRIP_EMOJIS[idx%TRIP_EMOJIS.length] };
      setTripMeta(m => ({...m, [name]:meta}));
      await supabase.from("trip_meta").upsert({ name, ...meta });
    }
    showToast(`✓ Created "${name}"`);
  }
  async function bulkAssign(ids, tripName) {
    const idSet = new Set(ids);
    let updated;
    if (tripName === "__regular") {
      updated = txs.filter(t => idSet.has(t.id)).map(t => ({...t, isTravel:false, tripName:""}));
      setTxs(ts => ts.map(t => idSet.has(t.id) ? {...t, isTravel:false, tripName:""} : t));
      showToast(`✓ Moved ${ids.length} item${ids.length!==1?"s":""} to Regular Expenses`);
    } else {
      updated = txs.filter(t => idSet.has(t.id)).map(t => ({...t, tripName, isTravel: tripName!=="" || t.isTravel}));
      setTxs(ts => ts.map(t => idSet.has(t.id) ? {...t, tripName, isTravel: tripName!=="" || t.isTravel} : t));
      showToast(`✓ Moved ${ids.length} transaction${ids.length!==1?"s":""}`);
    }
    await Promise.all(updated.map(t => supabase.from("transactions").update({ data: t }).eq("id", t.id)));
  }
  async function updateTripMeta(name, meta) {
    setTripMeta(m => ({...m, [name]:meta}));
    await supabase.from("trip_meta").upsert({ name, ...meta });
  }

  // ── Tx operations ──
  async function saveTx(u) {
    setTxs(ts=>ts.map(t=>t.id===u.id?u:t)); setEditTx(null);
    await supabase.from("transactions").update({ data: u }).eq("id", u.id);
    showToast("✓ Saved");
  }
  async function deleteTx(id) {
    setTxs(ts=>ts.filter(t=>t.id!==id)); setEditTx(null);
    await supabase.from("transactions").delete().eq("id", id);
    showToast("Deleted");
  }
  async function addTx(t) {
    setTxs(ts=>[t,...ts]); setShowAdd(false);
    await supabase.from("transactions").insert({ id: t.id, data: t });
    showToast("✓ Added");
  }
  async function addMany(arr) {
    const withMeta = arr.map(t => {
      if (t.tripName && !tripMeta[t.tripName]) {
        const idx = [...new Set([...trips, t.tripName])].indexOf(t.tripName);
        updateTripMeta(t.tripName, { color:TRIP_COLORS[idx%TRIP_COLORS.length], emoji:TRIP_EMOJIS[idx%TRIP_EMOJIS.length] });
      }
      return t;
    });
    setTxs(ts=>[...withMeta,...ts]);
    await supabase.from("transactions").insert(withMeta.map(t => ({ id: t.id, data: t })));
    showToast(`✓ Imported ${arr.length} transactions`);
  }

  // ── AI Chat ──
  async function sendChat(userText) {
    if (!userText.trim() || chatLoading) return;
    const userMsg = { role:"user", text:userText };
    setChatMsgs(m => [...m, userMsg]);
    setChatInput("");
    setChatLoading(true);

    const allCats = [...Object.keys(CATS), "Family Assistance", "Gifts", "Personal Care", "Other"];
    const recentTxs = txs.slice(0,10).map(t => `${t.date} ${t.desc} $${t.amount} [${t.cat}]`).join("\n");
    const tripList = trips.length > 0 ? trips.join(", ") : "none yet";

    // Build rich financial context from real transaction data
    const catBreakdown = {};
    txs.filter(t=>!t.isTravel).forEach(t => { catBreakdown[t.cat] = (catBreakdown[t.cat]||0) + t.effectiveAmount; });
    const mo_count = Math.max(1, [...new Set(txs.map(t=>t.month))].length);
    const avg_spend = Object.values(catBreakdown).reduce((s,v)=>s+v,0) / mo_count;
    const travel_avg = txs.filter(t=>t.isTravel).reduce((s,t)=>s+t.effectiveAmount,0) / mo_count;
    const cat_avgs = Object.entries(catBreakdown).map(([cat,total])=>({ cat, avg: Math.round(total/mo_count) })).sort((a,b)=>b.avg-a.avg);
    const current_rent = txs.find(t=>t.cat==="Rent")?.amount || 1485;
    const income = 4906;
    const savings_now = income - avg_spend;

    const systemPrompt = `You are a sharp, warm personal finance assistant AND expense-logging assistant for a user in Toronto, Canada.\n\n=== USER'S REAL FINANCIAL DATA ===\nMonthly income: $${income} (2x $2,453 paychecks, rising to $5,074 from June 2026)\nCurrent rent: $${current_rent}/mo\nAvg monthly spending (excl. travel, after insurance/splits): $${Math.round(avg_spend)}\nAvg monthly savings before travel: $${Math.round(savings_now)} (${ Math.round((savings_now/income)*100)}% of income)\nTravel (separate from regular budget): ~$${Math.round(travel_avg)}/mo avg\n\nSpending by category (monthly avg, effective cost):\n${cat_avgs.map(c=>"  "+c.cat+": $"+c.avg+"/mo").join("\\n")}\n\nRecent transactions:\n${recentTxs}\n\nAvailable categories: ${allCats.join(", ")}\nCurrent trips: ${tripList}\nToday: ${new Date().toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}\nCurrent month: ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date().getMonth()]}\n\n=== HOW TO RESPOND ===\nAlways reply with valid JSON only (no markdown):\n{ "reply": "...", "actions": [], "newCategories": [] }\n\n--- FINANCIAL ADVICE (affordability, budgets, savings, cutting expenses) ---\n- Use their ACTUAL numbers — never give generic advice\n- Show real math: e.g. new rent $2000 vs current $${current_rent} = $${2000-current_rent} extra/mo needed\n- Name exact categories and cut amounts: "Your Food & Dining is $X/mo — cutting to $Y saves $Z"\n- Consider June raise to $5,074 when relevant\n- Be honest if it's tight, but stay warm and encouraging\n- Use \\n for line breaks (mobile-friendly)\n- Leave actions array EMPTY for advice responses\n\n--- EXPENSE LOGGING (spent, paid, bought, add) ---\n- Fill actions with add_transaction objects\n- "monthly/every month" → add one for current month, note it recurs\n- "split with X" → isShared:true, sharedWith:name, splitPct:50 (or stated %)\n- "X% insurance" → insuranceCovered:true, insurancePct:X\n- Unknown category (e.g. family assistance) → add to newCategories\n- Unclear → ask one question, leave actions empty\n\nTransaction shape:\n{"type":"add_transaction","transaction":{"desc":"...","amount":0,"cat":"...","month":"Jun","card":"Bank Transfer","note":"...","isTravel":false,"tripName":"","insuranceCovered":false,"insurancePct":0,"isShared":false,"sharedWith":"","splitPct":100}}`;

    try {
      const resp = await fetch("/api/anthropic", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:1000,
          system: systemPrompt,
          messages:[
            ...chatMsgs.filter(m=>m.role==="user"||m.role==="assistant").slice(-6).map(m=>({
              role:m.role, content:m.text
            })),
            { role:"user", content:userText }
          ]
        })
      });
      const data = await resp.json();
      const raw  = data.content.find(b=>b.type==="text")?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());

      // Handle new categories
      if (parsed.newCategories?.length) {
        parsed.newCategories.forEach(cat => {
          if (!CATS[cat]) {
            // We can't mutate CATS const, so store in custom cats state
            // For demo, we just use the cat name as-is (it'll show without icon)
          }
        });
      }

      // Execute actions
      let addedCount = 0;
      if (parsed.actions?.length) {
        parsed.actions.forEach(action => {
          if (action.type === "add_transaction") {
            const t = action.transaction;
            const newTx = {
              id: uid(),
              ...t,
              amount: parseFloat(t.amount)||0,
              effectiveAmount: 0, // recalculated below
              date: `${t.month} ${new Date().getDate()}`,
            };
            newTx.effectiveAmount = calcEffective(newTx);
            setTxs(ts => [newTx, ...ts]);
            addedCount++;
          }
        });
      }

      setChatMsgs(m => [...m, { role:"assistant", text: parsed.reply || "Done!" }]);
      if (addedCount > 0) showToast(`✓ Added ${addedCount} transaction${addedCount!==1?"s":""} via chat`);
    } catch(e) {
      console.error(e);
      setChatMsgs(m => [...m, { role:"assistant", text:"Sorry, something went wrong. Try again?" }]);
    }
    setChatLoading(false);
  }

  // ── Derived ──
  const regularTxs  = txs.filter(t=>!t.isTravel);
  const travelTxs   = txs.filter(t=>t.isTravel);
  const allMonths   = [...new Set(txs.map(t=>t.month))].sort((a,b)=>MONTHS.indexOf(a)-MONTHS.indexOf(b));
  const catTotals   = {};
  regularTxs.forEach(t=>{ catTotals[t.cat]=(catTotals[t.cat]||0)+t.effectiveAmount; });
  const barMonths   = allMonths.length>0 ? allMonths : ["Jan"];
  const barData     = barMonths.map(m=>{ const o={month:m}; Object.keys(allCats).forEach(c=>{ o[c]=regularTxs.filter(t=>t.month===m&&t.cat===c).reduce((s,t)=>s+t.effectiveAmount,0); }); return o; });
  const totalReg    = regularTxs.reduce((s,t)=>s+t.effectiveAmount,0);
  const monthCount  = Math.max(1, allMonths.filter(m=>regularTxs.some(t=>t.month===m)).length);
  const avgMonthly  = totalReg/monthCount;
  const travelTotal = travelTxs.reduce((s,t)=>s+t.effectiveAmount,0);
  const savingsLeft = INCOME-avgMonthly;

  const tripCards = trips.map((name,i)=>{ const m=tripMeta[name]||{}; const trs=travelTxs.filter(t=>t.tripName===name); return { name, color:m.color||TRIP_COLORS[i%TRIP_COLORS.length], emoji:m.emoji||TRIP_EMOJIS[i%TRIP_EMOJIS.length], total:trs.reduce((s,t)=>s+t.effectiveAmount,0), count:trs.length, months:[...new Set(trs.map(t=>t.month))].join(", ")||"—", txs:trs }; });
  const untaggedTravel = travelTxs.filter(t=>!t.tripName);

  const listTxs = txs
    .filter(t => activeTab==="travel" ? t.isTravel : !t.isTravel)
    .filter(t => filterCat==="All" || t.cat===filterCat)
    .filter(t => filterMonth==="All" || t.month===filterMonth)
    .sort((a,b)=>{ const mi=MONTHS.indexOf(a.month)-MONTHS.indexOf(b.month); return mi!==0?mi:parseInt(a.date.split(" ")[1])-parseInt(b.date.split(" ")[1]); });

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"#0c0c1e", minHeight:"100vh", color:"#e8e8f0", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:32 }}>✦</div>
      <p style={{ fontSize:13, color:"#555" }}>Loading your data…</p>
    </div>
  );

  if (view==="trips") return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"#0c0c1e", minHeight:"100vh", color:"#e8e8f0", paddingBottom:80 }}>
      <style>{globalCSS}</style>
      {toast && <Toast msg={toast} />}
      {editTx && <EditSheet tx={editTx} trips={trips} tripMeta={tripMeta} cats={allCats} onAddCat={addCategory} onSave={saveTx} onDelete={deleteTx} onClose={()=>setEditTx(null)} />}
      <div style={{ maxWidth:500, margin:"0 auto", padding:"20px 14px 0" }}>
        <TripManager txs={txs} trips={trips} tripMeta={tripMeta}
          onRenameTrip={renameTrip} onDeleteTrip={deleteTrip} onCreateTrip={createTrip}
          onBulkAssign={bulkAssign} onUpdateTripMeta={updateTripMeta}
          onBack={()=>setView("dashboard")} />
      </div>
      <BottomNav view={view} setView={setView} onAdd={()=>setShowAdd(true)} onUpload={()=>setShowUpload(true)} onChat={()=>setView("chat")} />
      {showAdd && <AddSheet trips={trips} tripMeta={tripMeta} cats={allCats} onAddCat={addCategory} onSave={addTx} onClose={()=>setShowAdd(false)} />}
      {showUpload && <UploadSheet trips={trips} tripMeta={tripMeta} onAdd={addMany} onClose={()=>setShowUpload(false)} />}
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"#0c0c1e", minHeight:"100vh", color:"#e8e8f0", paddingBottom:80 }}>
      <style>{globalCSS}</style>
      {toast && <Toast msg={toast} />}
      {editTx    && <EditSheet tx={editTx} trips={trips} tripMeta={tripMeta} cats={allCats} onAddCat={addCategory} onSave={saveTx} onDelete={deleteTx} onClose={()=>setEditTx(null)} />}
      {showAdd   && <AddSheet  trips={trips} tripMeta={tripMeta} cats={allCats} onAddCat={addCategory} onSave={addTx} onClose={()=>setShowAdd(false)} onUpload={()=>setShowUpload(true)} />}
      {showUpload && <UploadSheet trips={trips} tripMeta={tripMeta} onAdd={addMany} onClose={()=>setShowUpload(false)} />}

      <div style={{ maxWidth:500, margin:"0 auto", padding:"20px 14px 0" }}>

        {/* ════ DASHBOARD ════ */}
        {view==="dashboard" && (<>
          <div style={{ marginBottom:18 }}>
            <p style={{ fontSize:10, letterSpacing:3, color:"#555", textTransform:"uppercase", fontFamily:"monospace", marginBottom:4 }}>Spending Tracker</p>
            <h1 style={{ fontSize:22, fontWeight:700 }}>Overview</h1>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
            {[
              {l:"Income",  v:`$${INCOME.toLocaleString()}`,                 c:"#52C47C"},
              {l:"Avg/mo",  v:`$${Math.round(avgMonthly).toLocaleString()}`, c:"#E8654A"},
              {l:"Savings", v:`$${Math.round(savingsLeft).toLocaleString()}`,c:savingsLeft>0?"#52C47C":"#ff7070"},
            ].map(k=>(
              <div key={k.l} className="card" style={{ padding:"12px 14px" }}>
                <p style={{ fontSize:9, color:"#555", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>{k.l.toUpperCase()}</p>
                <p style={{ fontSize:16, fontWeight:700, color:k.c, fontFamily:"monospace" }}>{k.v}</p>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:4, background:"#14142a", borderRadius:10, padding:4, border:"1px solid #22224a", marginBottom:14 }}>
            <button className={`tab-btn ${activeTab==="regular"?"on":""}`} onClick={()=>setActiveTab("regular")}>💳 Regular</button>
            <button className={`tab-btn ${activeTab==="travel"?"ont":""}`}  onClick={()=>setActiveTab("travel")}>✈️ Travel</button>
          </div>

          {activeTab==="regular" && (<>
            <div className="card" style={{ padding:"14px 10px 10px", marginBottom:14 }}>
              <p style={{ fontSize:9, color:"#555", fontFamily:"monospace", letterSpacing:2, marginBottom:10, paddingLeft:4 }}>MONTHLY BREAKDOWN</p>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={barData} margin={{left:-18,right:4}}>
                  <XAxis dataKey="month" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(1)+"k":v}`} />
                  <Tooltip content={<ChartTip cats={allCats}/>} />
                  {Object.keys(allCats).map(c=><Bar key={c} dataKey={c} stackId="a" fill={allCats[c].color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,total])=>(
              <div key={cat} className="card" style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, marginBottom:8, cursor:"pointer" }}
                onClick={()=>{ setFilterCat(cat); setFilterMonth("All"); setView("list"); }}>
                <span style={{fontSize:20}}>{CATS[cat]?.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600}}>{cat}</p>
                  <div style={{height:3,background:"#1e1e38",borderRadius:2,marginTop:5}}>
                    <div style={{height:"100%",width:`${Math.min(100,(total/Math.max(...Object.values(catTotals)))*100)}%`,background:CATS[cat]?.color,borderRadius:2}} />
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:CATS[cat]?.color}}>${Math.round(total).toLocaleString()}</p>
                  <p style={{fontSize:10,color:"#555"}}>{((total/(totalReg||1))*100).toFixed(0)}%</p>
                </div>
                <span style={{color:"#333"}}>›</span>
              </div>
            ))}
          </>)}

          {activeTab==="travel" && (<>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ fontSize:13, color:"#888" }}>Total travel</p>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <p style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:"#4ABBD9" }}>${Math.round(travelTotal).toLocaleString()}</p>
                <button onClick={()=>setView("trips")} style={{ background:"#1a3a5a", border:"none", color:"#4ABBD9", borderRadius:8, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Manage Trips →</button>
              </div>
            </div>

            {tripCards.map(trip=>(
              <div key={trip.name} className="tcard" style={{ padding:"14px 16px", marginBottom:10, cursor:"pointer" }}
                onClick={()=>{ setFilterCat("All"); setFilterMonth("All"); setActiveTab("travel"); setView("list"); }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div>
                    <p style={{ fontSize:15, fontWeight:700 }}>{trip.emoji} {trip.name}</p>
                    <p style={{ fontSize:11, color:"#4a7a9a", marginTop:3 }}>{trip.months} · {trip.count} transactions</p>
                  </div>
                  <p style={{ fontFamily:"monospace", fontSize:18, fontWeight:700, color:trip.color }}>${Math.round(trip.total).toLocaleString()}</p>
                </div>
                {trip.txs.slice(0,3).map(t=>(
                  <div key={t.id} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderTop:"1px solid #1a3a5a" }}>
                    <p style={{ fontSize:11, color:"#668", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"72%" }}>{t.desc}</p>
                    <p style={{ fontSize:11, fontFamily:"monospace", color:trip.color, flexShrink:0 }}>${t.effectiveAmount.toFixed(0)}</p>
                  </div>
                ))}
                {trip.txs.length>3 && <p style={{ fontSize:10, color:"#4a7a9a", marginTop:4 }}>+{trip.txs.length-3} more</p>}
              </div>
            ))}

            {untaggedTravel.length>0 && (
              <div style={{ background:"#141420", border:"1px dashed #33335a", borderRadius:12, padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}
                onClick={()=>setView("trips")}>
                <span style={{fontSize:22}}>🏷️</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:600,color:"#888"}}>Untagged travel · {untaggedTravel.length} items</p>
                  <p style={{fontSize:11,color:"#555",marginTop:2}}>Tap to assign to a trip →</p>
                </div>
              </div>
            )}
          </>)}
        </>)}

        {/* ════ LIST ════ */}
        {view==="list" && (<>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={()=>{ setView("dashboard"); setFilterCat("All"); }} style={{ background:"none", border:"1px solid #33335a", color:"#888", cursor:"pointer", borderRadius:8, padding:"7px 12px", fontFamily:"inherit", fontSize:12 }}>← Back</button>
            <h2 style={{fontSize:18,fontWeight:700}}>Transactions</h2>
          </div>
          <div style={{ display:"flex", gap:4, background:"#14142a", borderRadius:10, padding:4, border:"1px solid #22224a", marginBottom:12 }}>
            <button className={`tab-btn ${activeTab==="regular"?"on":""}`} onClick={()=>setActiveTab("regular")}>💳 Regular</button>
            <button className={`tab-btn ${activeTab==="travel"?"ont":""}`}  onClick={()=>setActiveTab("travel")}>✈️ Travel</button>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:8, overflowX:"auto", paddingBottom:4 }}>
            {["All",...allMonths].map(m=>(
              <button key={m} className="pill" style={{ background:filterMonth===m?"#6060ee":"#14142a", color:filterMonth===m?"#fff":"#666", border:`1px solid ${filterMonth===m?"#6060ee":"#22224a"}` }} onClick={()=>setFilterMonth(m)}>{m}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", paddingBottom:4 }}>
            {["All",...Object.keys(allCats)].map(c=>(
              <button key={c} className="pill" style={{ background:filterCat===c?(allCats[c]?.color||"#6060ee"):"#14142a", color:filterCat===c?"#fff":"#666", border:`1px solid ${filterCat===c?(allCats[c]?.color||"#6060ee"):"#22224a"}` }} onClick={()=>setFilterCat(c)}>
                {c==="All"?"All":allCats[c].icon+" "+c}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <p style={{fontSize:11,color:"#666"}}>{listTxs.length} transactions</p>
            <div style={{textAlign:"right"}}>
              {listTxs.some(t=>t.effectiveAmount!==t.amount) && <p style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>Original: <span style={{textDecoration:"line-through"}}>${listTxs.reduce((s,t)=>s+t.amount,0).toFixed(2)}</span></p>}
              <p style={{fontSize:14,fontWeight:700,color:"#6060ee",fontFamily:"monospace"}}>Effective: ${listTxs.reduce((s,t)=>s+t.effectiveAmount,0).toFixed(2)}</p>
            </div>
          </div>
          {listTxs.length===0
            ? <p style={{color:"#555",textAlign:"center",padding:"40px 0",fontSize:14}}>No transactions found</p>
            : listTxs.map(t=>(
              <div key={t.id} className={`tx ${t.isTravel?"txt":""}`} onClick={()=>setEditTx(t)}>
                <span style={{fontSize:20,marginTop:1}}>{CATS[t.cat]?.icon||"•"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.desc}</p>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>{t.date}</span>
                    <span style={{fontSize:10,padding:"1px 6px",borderRadius:10,background:`${(CARD_COLORS[t.card]||"#888")}22`,color:CARD_COLORS[t.card]||"#888"}}>{t.card}</span>
                    {t.insuranceCovered && <span style={{fontSize:10,color:"#52C47C"}}>🏥{t.insurancePct}%</span>}
                    {t.isShared && <span style={{fontSize:10,color:"#E8A838"}}>👥{t.splitPct}% {t.sharedWith}</span>}
                    {t.tripName && <span style={{fontSize:10,color:tripMeta[t.tripName]?.color||"#4ABBD9"}}>✈️ {t.tripName}</span>}
                    {t.note && <span style={{fontSize:10,color:"#7070bb"}}>📝 {t.note}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {t.effectiveAmount!==t.amount && <p style={{fontSize:10,color:"#444",fontFamily:"monospace",textDecoration:"line-through"}}>${t.amount.toFixed(2)}</p>}
                  <p style={{fontFamily:"monospace",fontSize:14,fontWeight:600,color:CATS[t.cat]?.color||"#e8e8f0"}}>${t.effectiveAmount.toFixed(2)}</p>
                </div>
              </div>
            ))
          }
        </>)}

        {/* ════ CHAT ════ */}
        {view==="chat" && (<>
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:10, letterSpacing:3, color:"#555", textTransform:"uppercase", fontFamily:"monospace", marginBottom:4 }}>AI Assistant</p>
            <h1 style={{ fontSize:22, fontWeight:700 }}>Add by Chat</h1>
            <p style={{ color:"#555", fontSize:12, marginTop:3 }}>Type or speak naturally — I'll figure out the rest</p>
          </div>

          {/* Suggestion chips */}
          <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
            {[
              "Can I afford $2000 rent?",
              "What expenses should I cut?",
              "How much am I saving monthly?",
              "Paid mum $150 allowance monthly",
              "Split $80 dinner with Jake",
              "Spent $45 at Freshco today",
              "That Shoppers was 80% insured",
            ].map(s=>(
              <button key={s} onClick={()=>{ setChatInput(s); }}
                style={{ background:"#14142a", border:"1px solid #22224a", color:"#888", borderRadius:20, padding:"6px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ background:"#10101e", borderRadius:14, padding:"14px", marginBottom:12, minHeight:340, maxHeight:420, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
            {chatMsgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                {m.role==="assistant" && (
                  <div style={{ width:28, height:28, borderRadius:14, background:"#6060ee", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginRight:8, marginTop:2 }}>✦</div>
                )}
                <div style={{
                  maxWidth:"80%", padding:"10px 14px", borderRadius: m.role==="user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role==="user" ? "#6060ee" : "#1e1e38",
                  color: m.role==="user" ? "#fff" : "#e8e8f0",
                  fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:14, background:"#6060ee", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>✦</div>
                <div style={{ background:"#1e1e38", borderRadius:"14px 14px 14px 4px", padding:"10px 14px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{ width:6, height:6, borderRadius:3, background:"#6060ee", animation:`bounce 1s ${i*0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <div style={{ flex:1, background:"#14142a", border:"1px solid #22224a", borderRadius:14, padding:"4px 4px 4px 14px", display:"flex", alignItems:"center" }}>
              <textarea
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat(chatInput);} }}
                placeholder="e.g. Paid mum $150 monthly allowance…"
                rows={1}
                style={{ flex:1, background:"none", border:"none", color:"#e8e8f0", fontSize:14, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.5, padding:"8px 0", maxHeight:100, overflowY:"auto" }}
              />
              <button onClick={()=>sendChat(chatInput)} disabled={!chatInput.trim()||chatLoading}
                style={{ width:38, height:38, borderRadius:10, background:chatInput.trim()&&!chatLoading?"#6060ee":"#22224a", border:"none", color:chatInput.trim()&&!chatLoading?"#fff":"#444", fontSize:16, cursor:chatInput.trim()&&!chatLoading?"pointer":"default", flexShrink:0, transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {chatLoading ? "…" : "↑"}
              </button>
            </div>
          </div>

          <p style={{ fontSize:10, color:"#444", textAlign:"center", marginTop:10 }}>
            Press Enter to send · Shift+Enter for new line
          </p>

          <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
        </>)}
      </div>

      <BottomNav view={view} setView={setView} onAdd={()=>setShowAdd(true)} onUpload={()=>setShowUpload(true)} onChat={()=>setView("chat")} />
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────
function Toast({ msg }) {
  return <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#2a2a5a", border:"1px solid #4040aa", borderRadius:20, padding:"8px 20px", fontSize:13, fontWeight:600, zIndex:200, color:"#a0a0ff", whiteSpace:"nowrap" }}>{msg}</div>;
}
function BottomNav({ view, setView, onAdd, onUpload, onChat }) {
  return (
    <nav className="bnav">
      <button className={`nbtn ${view==="dashboard"?"on":""}`} onClick={()=>setView("dashboard")}><span style={{fontSize:18}}>📊</span>Dashboard</button>
      <button className={`nbtn ${view==="list"?"on":""}`}      onClick={()=>setView("list")}><span style={{fontSize:18}}>📋</span>Transactions</button>
      <button className="nbtn" style={{color:"#6060ee"}}        onClick={onAdd}><span style={{fontSize:24,lineHeight:1}}>⊕</span>Add</button>
      <button className={`nbtn ${view==="trips"?"on":""}`}      onClick={()=>setView("trips")}><span style={{fontSize:18}}>✈️</span>Trips</button>
      <button className={`nbtn ${view==="chat"?"on":""}`}       onClick={onChat}><span style={{fontSize:18}}>💬</span>Chat</button>
    </nav>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  input,select{color:#e8e8f0!important;outline:none}
  select option{background:#16162e}
  .card{background:#14142a;border:1px solid #22224a;border-radius:14px}
  .tcard{background:#0e1822;border:1px solid #1a3a5a;border-radius:14px}
  .tx{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;cursor:pointer;transition:background 0.15s;margin-bottom:4px;background:#0e0e20}
  .tx:hover,.tx:active{background:#18183a}
  .txt{background:#0a1825}.txt:hover,.txt:active{background:#0f2035}
  .tab-btn{background:none;border:none;cursor:pointer;padding:8px;flex:1;font-family:inherit;font-size:12px;font-weight:600;border-radius:8px;transition:all 0.15s;color:#555}
  .tab-btn.on{background:#22224a;color:#e8e8f0}
  .tab-btn.ont{background:#1a3a5a;color:#4ABBD9}
  .pill{cursor:pointer;border:none;font-family:inherit;font-size:11px;font-weight:500;border-radius:20px;padding:5px 11px;transition:all 0.15s;white-space:nowrap;flex-shrink:0}
  .bnav{position:fixed;bottom:0;left:0;right:0;background:#12122a;border-top:1px solid #22224a;display:flex;z-index:50;padding-bottom:env(safe-area-inset-bottom)}
  .nbtn{flex:1;background:none;border:none;color:#555;cursor:pointer;padding:10px 0 6px;font-family:inherit;font-size:10px;display:flex;flex-direction:column;align-items:center;gap:2px;transition:color 0.15s}
  .nbtn.on{color:#6060ee}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:#33335a;border-radius:2px}
  input[type=range]{height:4px}
`;