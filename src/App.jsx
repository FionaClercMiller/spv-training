
import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, BarChart3, CalendarDays, ClipboardCheck, Dumbbell, HeartPulse,
  LayoutDashboard, Menu, Plus, Settings, Shield, Timer, TrendingUp, Waves,
  X, LogOut, Cloud, CloudOff, ChevronRight, Flame, Target, CheckCircle2
} from 'lucide-react';

import { HISTORY_ENTRIES, HISTORY_TESTS } from './historique.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = URL && KEY ? createClient(URL, KEY) : null;
const today = new Date().toISOString().slice(0,10);
const initialTests = [
  {key:'natation',label:'Natation',target:50,unit:'m',hint:'50 mètres nage libre'},
  {key:'vertige',label:'Vertige',target:15,unit:'m',hint:'Contrôle à 15 mètres'},
  {key:'gainage',label:'Gainage',target:110,unit:'s',hint:'1 min 50 s'},
  {key:'pompes',label:'Pompes',target:7,unit:'rép.',hint:'7 répétitions'},
  {key:'lucleger',label:'Luc Léger',target:6,unit:'palier',hint:'Palier 6'}
];
const starter = {
  entries: [
    {id:'demo1',date:'2026-11-22',category:'Cardio + salle',title:'Reprise — vélo, tapis et renforcement',duration_minutes:45,distance_km:2.66,notes:'Bonne séance. Marche de récupération sur tapis. Genou et cheville gauches à surveiller.',exercises:[{name:'Vélo',sets:'5 min',weight:'',reps:''},{name:'Tapis',sets:'',weight:'',reps:'1,05 km'},{name:'Squats',sets:'',weight:'',reps:''},{name:'Fentes assistées',sets:'',weight:'',reps:''}]}
  ],
  plans: [
    {id:'p1',date:today,title:'Séance cardio douce',category:'Cardio',status:'À faire',notes:'Vélo + tapis selon les sensations.'},
    {id:'p2',date:today,title:'Mobilité et récupération',category:'Récupération',status:'À faire',notes:'Mobilité douce, sans forcer.'}
  ],
  tests: [
    {id:'t1',test_key:'gainage',test_label:'Gainage',value:180,unit:'s',date:'2026-11-17',notes:'Meilleur résultat connu'},
    {id:'t2',test_key:'lucleger',test_label:'Luc Léger',value:4.5,unit:'palier',date:'2026-10-08',notes:'Résultat de référence communiqué'},
    {id:'t3',test_key:'pompes',test_label:'Pompes',value:7,unit:'rép.',date:'2026-10-08',notes:'À confirmer en répétitions strictes'}
  ],
  recovery: [{id:'r1',date:'2026-11-22',energy:3,fatigue:2,soreness:'Jambes légèrement sollicitées',pain:'Légère sensibilité genou et cheville gauches',notes:'Récupération correcte avec pauses marchées.'}]
};
const nav = [
  ['dashboard','Vue d’ensemble',LayoutDashboard],['journal','Journal',Activity],['stats','Statistiques',BarChart3],
  ['planning','Planning',CalendarDays],['tests','Épreuves SPV',ClipboardCheck],['salle','Salle',Dumbbell],
  ['recovery','Récupération',HeartPulse],['programs','Programmes',Target]
];
const loadLocal = () => { try { return JSON.parse(localStorage.getItem('spv-data')) || starter; } catch { return starter; } };
const saveLocal = d => localStorage.setItem('spv-data', JSON.stringify(d));
const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());

export default function App(){
  const [data,setData] = useState(loadLocal);
  const [page,setPage] = useState('dashboard');
  const [modal,setModal] = useState('');
  const [mobile,setMobile] = useState(false);
  const [session,setSession] = useState(null);
  const [authReady,setAuthReady] = useState(false);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [authMsg,setAuthMsg] = useState('');
  const [busy,setBusy] = useState(false);
  const [syncMsg,setSyncMsg] = useState('');

  useEffect(()=>{
    if(!supabase){setAuthReady(true);return;}
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{saveLocal(data);},[data]);
  useEffect(()=>{
    if(!supabase || !session?.user) return;
    (async()=>{
      setSyncMsg('Synchronisation…');
      const uid=session.user.id;
      const [a,b,c,d]=await Promise.all([
        supabase.from('training_entries').select('*').eq('user_id',uid).order('date',{ascending:false}),
        supabase.from('plans').select('*').eq('user_id',uid).order('date'),
        supabase.from('test_results').select('*').eq('user_id',uid).order('date',{ascending:false}),
        supabase.from('recovery_logs').select('*').eq('user_id',uid).order('date',{ascending:false})
      ]);
      const err=[a,b,c,d].find(x=>x.error)?.error;
      if(err){setSyncMsg('Erreur de synchronisation : vérifie le schéma SQL.');return;}
      setData({entries:a.data||[],plans:b.data||[],tests:c.data||[],recovery:d.data||[]});
      setSyncMsg('Données synchronisées');
    })();
  },[session]);
  const update = (key,rows) => setData(old=>({...old,[key]:rows}));
  const addRow = async (table,key,row) => {
    const localRow={id:uid(),...row};
    update(key,[localRow,...data[key]]);
    if(supabase && session?.user){
      const {error}=await supabase.from(table).insert({...localRow,user_id:session.user.id});
      if(error) setSyncMsg('Enregistrement distant impossible : '+error.message);
      else setSyncMsg('Enregistré et synchronisé');
    }
    setModal('');
  };
  const removeRow = async (table,key,id) => {
    update(key,data[key].filter(x=>x.id!==id));
    if(supabase && session?.user) await supabase.from(table).delete().eq('id',id).eq('user_id',session.user.id);
  };
  const signIn = async e => {e.preventDefault();setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setAuthMsg(error?.message || 'Connexion réussie.');setBusy(false);};
  const signUp = async e => {e.preventDefault();setBusy(true);setAuthMsg('');
    const {error}=await supabase.auth.signUp({email,password});
    setAuthMsg(error?.message || 'Compte créé. Vérifie ton e-mail si la confirmation est activée.');setBusy(false);};
  const needsImport = !data.entries.some(e=>e.id===HISTORY_ENTRIES[0].id);
  const importHistory = async () => {
    const ids = new Set(HISTORY_ENTRIES.map(e=>e.id)), tids = new Set(HISTORY_TESTS.map(t=>t.id));
    const demo = new Set(['demo1','t1','t2','t3']);
    setData(old=>({...old,
      entries:[...HISTORY_ENTRIES,...old.entries.filter(e=>!ids.has(e.id)&&!demo.has(e.id))],
      tests:[...HISTORY_TESTS,...old.tests.filter(t=>!tids.has(t.id)&&!demo.has(t.id))]}));
    if(supabase && session?.user){
      const u=session.user.id;
      const a=await supabase.from('training_entries').upsert(HISTORY_ENTRIES.map(r=>({...r,user_id:u})),{onConflict:'id'});
      const b=await supabase.from('test_results').upsert(HISTORY_TESTS.map(r=>({...r,user_id:u})),{onConflict:'id'});
      const err=a.error||b.error;
      setSyncMsg(err?'Import local fait, mais synchronisation impossible : '+err.message:'Historique importé et synchronisé');
    }
  };
  const signOut = async()=>{await supabase?.auth.signOut();setSession(null);};
  const title = nav.find(n=>n[0]===page)?.[1] || 'Vue d’ensemble';
  const recent = [...data.entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  const completed = data.plans.filter(p=>p.status==='Terminée').length;
  const avgEnergy = data.recovery.length ? (data.recovery.reduce((s,r)=>s+Number(r.energy||0),0)/data.recovery.length).toFixed(1) : '—';

  return <div className="app-shell">
    <aside className={`sidebar ${mobile?'show':''}`}>
      <div className="brand"><div className="brand-mark"><Flame size={23}/></div><div><strong>SPV <span>TRAINING</span></strong><small>TON ESPACE DE PRÉPARATION</small></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div>
      <div className="nav-label">ESPACE PERSONNEL</div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>{setPage(id);setMobile(false);}}><Icon size={18}/><span>{label}</span>{page===id&&<ChevronRight size={16} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="goal-card"><div className="goal-icon"><Shield size={18}/></div><div><b>Objectif SPV</b><small>Palier 6 • Tests physiques</small></div><div className="goal-line"><i/></div></div><button className="nav-item" onClick={()=>setModal('settings')}><Settings size={18}/>Paramètres</button><div className="profile"><div className="avatar">F</div><div><b>Mon espace</b><small>{session?.user?.email || 'Mode local'}</small></div><button title="Déconnexion" onClick={signOut}><LogOut size={16}/></button></div></div>
    </aside>
    {mobile&&<div className="scrim" onClick={()=>setMobile(false)}/>}
    <main className="main">
      <header className="topbar"><button className="hamburger" onClick={()=>setMobile(true)}><Menu/></button><div className="crumb">SPV TRAINING <span>/</span> <b>{title.toUpperCase()}</b></div><div className="top-actions"><span className={`sync ${session?'online':''}`}>{session?<Cloud size={15}/>:<CloudOff size={15}/>} {session?'Connecté':supabase?'Hors connexion':'Mode local'}</span><div className="date-pill">{new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'})}</div></div></header>
      <div className="content">
        {page==='dashboard'&&<Dashboard data={data} recent={recent} completed={completed} avgEnergy={avgEnergy} setPage={setPage} setModal={setModal} needsImport={needsImport} importHistory={importHistory}/>}
        {page==='journal'&&<Journal rows={data.entries} setModal={setModal} remove={id=>removeRow('training_entries','entries',id)}/>}
        {page==='stats'&&<Stats data={data}/>}
        {page==='planning'&&<Planning rows={data.plans} setModal={setModal} toggle={async row=>{const next={...row,status:row.status==='Terminée'?'À faire':'Terminée'};update('plans',data.plans.map(x=>x.id===row.id?next:x));if(supabase&&session?.user)await supabase.from('plans').update({status:next.status}).eq('id',row.id).eq('user_id',session.user.id);}} remove={id=>removeRow('plans','plans',id)}/>}
        {page==='tests'&&<Tests rows={data.tests} setModal={setModal} remove={id=>removeRow('test_results','tests',id)}/>}
        {page==='salle'&&<Gym rows={data.entries} setModal={setModal}/>}
        {page==='recovery'&&<Recovery rows={data.recovery} setModal={setModal} remove={id=>removeRow('recovery_logs','recovery',id)}/>}
        {page==='programs'&&<Programs setModal={setModal} setPage={setPage}/>}
        <footer>SPV TRAINING <span>•</span> Construis ta progression, séance après séance.</footer>
      </div>
    </main>
    {modal&&<Modal type={modal} close={()=>setModal('')} addRow={addRow}/>}
    {page==='settings'&&null}
    {modal==='settings'&&<SettingsModal close={()=>setModal('')} supabase={supabase} session={session} email={email} setEmail={setEmail} password={password} setPassword={setPassword} signIn={signIn} signUp={signUp} signOut={signOut} busy={busy} msg={authMsg} syncMsg={syncMsg}/>}
  </div>;
}

function PageHead({eyebrow,title,desc,action}){return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>}
function Button({children,onClick,kind='primary'}){return <button className={`btn ${kind}`} onClick={onClick}>{children}</button>}
function Metric({label,value,unit,icon:Icon,sub}){return <div className="metric"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18}/></div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-sub">{sub}</div></div>}
function Dashboard({data,recent,completed,avgEnergy,setPage,setModal,needsImport,importHistory}){
 const last=[...data.tests].sort((a,b)=>b.date.localeCompare(a.date));
 const test=initialTests.map(t=>{const r=last.find(x=>x.test_key===t.key);return {...t,current:r?.value??0,date:r?.date};});
 return <>
  <div className="welcome"><div><div className="eyebrow"><span className="live-dot"/> TON TABLEAU DE BORD</div><h1>Chaque séance te rapproche<br/><em>de ton objectif.</em></h1><p>Ta préparation SPV, centralisée au même endroit.</p></div><div className="welcome-mark"><Flame size={76}/><span>SPV</span></div></div>
  <div className="metric-grid"><Metric label="Séances enregistrées" value={data.entries.length} unit="" icon={Activity} sub="Depuis le début du suivi"/><Metric label="Tests renseignés" value={data.tests.length} unit="" icon={ClipboardCheck} sub="Résultats enregistrés"/><Metric label="Séances terminées" value={completed} unit="" icon={CheckCircle2} sub="Dans ton planning"/><Metric label="Énergie moyenne" value={avgEnergy} unit="/ 5" icon={HeartPulse} sub="D'après tes relevés"/></div>
  <div className="section-title"><div><div className="eyebrow">SUIVI DES OBJECTIFS</div><h2>Épreuves SPV</h2></div><button className="text-link" onClick={()=>setPage('tests')}>Voir les résultats <ChevronRight size={16}/></button></div>
  <div className="test-grid">{test.map(t=><div className="test-card" key={t.key}><div className="test-card-head"><span>{t.label}</span><span className="test-dot"/></div><div className="test-number">{t.current||'—'}<small> {t.unit}</small></div><div className="progress"><i style={{width:Math.min(100,(t.current/t.target)*100)+'%'}}/></div><div className="test-foot"><span>Objectif : {t.target} {t.unit}</span><b>{t.current?Math.min(100,Math.round(t.current/t.target*100))+'%':'À renseigner'}</b></div></div>)}</div>
  <div className="two-col"><section className="panel"><div className="panel-head"><div><div className="eyebrow">DERNIÈRES ACTIVITÉS</div><h2>Ton journal</h2></div><button className="text-link" onClick={()=>setPage('journal')}>Tout voir <ChevronRight size={16}/></button></div>{recent.length?recent.map(r=><div className="activity-row" key={r.id}><div className="activity-icon"><Activity size={18}/></div><div className="activity-info"><b>{r.title}</b><small>{fmtDate(r.date)} · {r.category}</small></div><strong>{r.duration_minutes?`${r.duration_minutes} min`:'—'}</strong></div>):<Empty text="Tes séances apparaîtront ici."/>}</section>
  <section className="panel"><div className="panel-head"><div><div className="eyebrow">À VENIR</div><h2>Planning</h2></div><button className="text-link" onClick={()=>setPage('planning')}>Calendrier <ChevronRight size={16}/></button></div>{data.plans.slice(0,4).map(p=><div className="plan-row" key={p.id}><div className="plan-date"><b>{new Date(p.date+'T12:00:00').getDate()}</b><small>{new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR',{month:'short'})}</small></div><div className="activity-info"><b>{p.title}</b><small>{p.category}</small></div><span className={`status ${p.status==='Terminée'?'done':''}`}>{p.status}</span></div>)}{!data.plans.length&&<Empty text="Aucune séance programmée."/>}</section></div>
  {needsImport&&<div className="quick-actions" style={{marginBottom:19}}><div><b>Historique ChatGPT prêt à importer</b><small>{HISTORY_ENTRIES.length} séances (29/08 → 25/11) et {HISTORY_TESTS.length} résultats d’épreuves. Remplace les données d’exemple.</small></div><Button onClick={importHistory}>Importer</Button></div>}
  <div className="quick-actions"><div><b>Prêt à enregistrer une séance ?</b><small>Garde une trace de chaque effort.</small></div><Button onClick={()=>setModal('entry')}><Plus size={17}/> Nouvelle séance</Button></div>
 </>;
}
function Empty({text}){return <div className="empty">{text}</div>}
function Journal({rows,setModal,remove}){return <><PageHead eyebrow="HISTORIQUE" title="Journal d'entraînement" desc="Toutes tes séances, au même endroit." action={<Button onClick={()=>setModal('entry')}><Plus size={17}/> Ajouter une séance</Button>}/><div className="panel">{rows.length?rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=><div className="list-row" key={r.id}><div className="activity-icon"><Activity size={18}/></div><div className="activity-info"><b>{r.title}</b><small>{fmtDate(r.date)} · {r.category}{r.notes?' · '+r.notes:''}</small></div><div className="row-meta">{r.duration_minutes?`${r.duration_minutes} min`:''} {r.distance_km?` · ${r.distance_km} km`:''}</div><button className="delete" onClick={()=>remove(r.id)}>Supprimer</button></div>):<Empty text="Aucune séance enregistrée pour le moment."/>}</div></>}
function Stats({data}){const byMonth={};data.entries.forEach(e=>{const k=e.date.slice(0,7);byMonth[k]=(byMonth[k]||0)+1;});const months=Object.entries(byMonth).sort().slice(-6);const max=Math.max(1,...months.map(x=>x[1]));return <><PageHead eyebrow="ANALYSE" title="Statistiques" desc="Observe tes habitudes et mesure ta régularité."/><div className="metric-grid"><Metric label="Total séances" value={data.entries.length} icon={Activity} sub="Journal complet"/><Metric label="Temps d'entraînement" value={data.entries.reduce((s,e)=>s+Number(e.duration_minutes||0),0)} unit=" min" icon={Timer} sub="Durée cumulée"/><Metric label="Distance cumulée" value={data.entries.reduce((s,e)=>s+Number(e.distance_km||0),0).toFixed(2)} unit=" km" icon={TrendingUp} sub="Toutes activités confondues"/><Metric label="Résultats de tests" value={data.tests.length} icon={Target} sub="Historique disponible"/></div><div className="panel chart-panel"><div className="panel-head"><div><div className="eyebrow">RÉGULARITÉ</div><h2>Séances par mois</h2></div></div>{months.length?<div className="bar-chart">{months.map(([m,n])=><div className="bar-col" key={m}><b>{n}</b><div className="bar-track"><i style={{height:(n/max*100)+'%'}}/></div><small>{new Date(m+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'short'})}</small></div>)}</div>:<Empty text="Ajoute des séances pour faire apparaître tes statistiques."/>}</div><div className="panel"><div className="panel-head"><div><div className="eyebrow">DERNIERS RÉSULTATS</div><h2>Évolution des tests</h2></div></div>{initialTests.map(t=>{const arr=data.tests.filter(x=>x.test_key===t.key).sort((a,b)=>b.date.localeCompare(a.date));return <div className="test-history" key={t.key}><b>{t.label}</b><span>{arr[0]?`${arr[0].value} ${arr[0].unit} · ${fmtDate(arr[0].date)}`:'Pas encore de résultat'}</span></div>})}</div></>}
function Planning({rows,setModal,toggle,remove}){const [filter,setFilter]=useState('Tous');const shown=rows.filter(x=>filter==='Tous'||x.status===filter).sort((a,b)=>a.date.localeCompare(b.date));return <><PageHead eyebrow="ORGANISATION" title="Planning" desc="Organise tes entraînements et tes jours de récupération." action={<Button onClick={()=>setModal('plan')}><Plus size={17}/> Planifier</Button>}/><div className="filters">{['Tous','À faire','Terminée'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><div className="panel">{shown.map(p=><div className="list-row" key={p.id}><div className="plan-date"><b>{new Date(p.date+'T12:00:00').getDate()}</b><small>{new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR',{month:'short'})}</small></div><div className="activity-info"><b>{p.title}</b><small>{fmtDate(p.date)} · {p.category}{p.notes?' · '+p.notes:''}</small></div><span className={`status ${p.status==='Terminée'?'done':''}`}>{p.status}</span><button className="text-link" onClick={()=>toggle(p)}>{p.status==='Terminée'?'Réouvrir':'Terminer'}</button><button className="delete" onClick={()=>remove(p.id)}>×</button></div>)}{!shown.length&&<Empty text="Aucune séance dans cette catégorie."/>}</div></>}
function Tests({rows,setModal,remove}){return <><PageHead eyebrow="ÉVALUATION" title="Épreuves SPV" desc="Enregistre tes résultats et compare-les aux objectifs de préparation." action={<Button onClick={()=>setModal('test')}><Plus size={17}/> Ajouter un résultat</Button>}/><div className="test-grid large">{initialTests.map(t=>{const arr=rows.filter(x=>x.test_key===t.key).sort((a,b)=>b.date.localeCompare(a.date));const r=arr[0];const pct=r?Math.min(100,Math.round(r.value/t.target*100)):0;return <div className="test-card" key={t.key}><div className="test-card-head"><span>{t.label}</span><ClipboardCheck size={17}/></div><div className="test-number">{r?r.value:'—'}<small> {t.unit}</small></div><div className="progress"><i style={{width:pct+'%'}}/></div><div className="test-foot"><span>Objectif : {t.target} {t.unit}</span><b>{r?pct+'%':'À renseigner'}</b></div><small className="hint">{t.hint}</small></div>})}</div><div className="panel"><div className="panel-head"><div><div className="eyebrow">HISTORIQUE</div><h2>Mes évaluations</h2></div></div>{rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=><div className="list-row" key={r.id}><div className="activity-icon"><Target size={18}/></div><div className="activity-info"><b>{r.test_label}</b><small>{fmtDate(r.date)}{r.notes?' · '+r.notes:''}</small></div><strong>{r.value} {r.unit}</strong><button className="delete" onClick={()=>remove(r.id)}>Supprimer</button></div>)}{!rows.length&&<Empty text="Enregistre un premier résultat pour commencer ton suivi."/>}</div></>}
function Gym({rows,setModal}){const exercises=rows.flatMap(r=>(r.exercises||[]).map(e=>({...e,date:r.date,session:r.title})));return <><PageHead eyebrow="RENFORCEMENT" title="Espace salle" desc="Suis tes exercices, tes charges et tes répétitions." action={<Button onClick={()=>setModal('entry')}><Plus size={17}/> Ajouter une séance</Button>}/><div className="metric-grid"><Metric label="Séances avec exercices" value={rows.filter(r=>r.exercises?.length).length} icon={Dumbbell} sub="Séances renseignées"/><Metric label="Exercices consignés" value={exercises.length} icon={Activity} sub="Dans ton journal"/></div><div className="panel"><div className="panel-head"><div><div className="eyebrow">CARNET DE MUSCULATION</div><h2>Derniers exercices</h2></div></div>{exercises.length?exercises.map((e,i)=><div className="list-row" key={i}><div className="activity-icon"><Dumbbell size={18}/></div><div className="activity-info"><b>{e.name}</b><small>{e.session} · {fmtDate(e.date)}</small></div><strong>{[e.sets,e.weight&&e.weight+' kg',e.reps&&e.reps+' reps'].filter(Boolean).join(' · ')||'Détails non précisés'}</strong></div>):<Empty text="Tes exercices apparaîtront ici lorsque tu détailleras tes séances."/>}</div><div className="note-box"><b>Conseil de suivi</b><p>Note les charges uniquement lorsqu'elles sont connues, et conserve une trace des répétitions propres. La progression ne nécessite pas d'augmenter le poids à chaque séance.</p></div></>}
function Recovery({rows,setModal,remove}){return <><PageHead eyebrow="ÉCOUTE DU CORPS" title="Récupération" desc="Énergie, fatigue, courbatures et douleurs : garde une trace de tes sensations." action={<Button onClick={()=>setModal('recovery')}><Plus size={17}/> Nouveau relevé</Button>}/><div className="panel"><div className="panel-head"><div><div className="eyebrow">JOURNAL DE RÉCUPÉRATION</div><h2>Mes relevés</h2></div></div>{rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(r=><div className="recovery-row" key={r.id}><div className="recovery-date">{fmtDate(r.date)}</div><div className="score"><small>Énergie</small><b>{r.energy}/5</b></div><div className="score"><small>Fatigue</small><b>{r.fatigue}/5</b></div><div className="activity-info"><b>{r.soreness||'Aucune courbature notée'}</b><small>{r.pain||'Aucune douleur notée'}{r.notes?' · '+r.notes:''}</small></div><button className="delete" onClick={()=>remove(r.id)}>Supprimer</button></div>)}{!rows.length&&<Empty text="Aucun relevé pour le moment."/>}</div><div className="note-box"><b>À retenir</b><p>Ce journal sert à repérer des tendances, pas à établir un diagnostic. Une douleur inhabituelle, persistante ou qui s'aggrave mérite un avis médical avant de forcer.</p></div></>}
function Programs({setModal,setPage}){const programs=[['Fondations cardio','Développer progressivement l’endurance avec vélo, tapis et rameur.','Cardio'],['Renforcement général','Travailler les grands groupes musculaires avec une technique maîtrisée.','Renforcement'],['Préparation Luc Léger','Alterner endurance fondamentale, accélérations progressives et récupération.','Luc Léger'],['Mobilité & récupération','Entretenir la mobilité et favoriser la récupération entre les séances.','Récupération']];return <><PageHead eyebrow="CAP SUR L’OBJECTIF" title="Programmes" desc="Des trames de travail à adapter à ta forme du jour."/><div className="program-grid">{programs.map(([name,desc,cat],i)=><div className="program-card" key={name}><div className="program-top"><span>0{i+1}</span><Target size={19}/></div><h3>{name}</h3><p>{desc}</p><div className="program-bottom"><span>{cat}</span><button onClick={()=>{setPage('planning');setModal('plan')}}>Programmer <ChevronRight size={15}/></button></div></div>)}</div><div className="note-box"><b>Programmes évolutifs</b><p>Les programmes sont des trames de départ, pas des prescriptions automatiques. On ajustera les volumes selon tes résultats, tes contraintes articulaires, ta récupération et les consignes de ton encadrement médical ou sportif.</p></div></>}
function Modal({type,close,addRow}){const [form,setForm]=useState({date:today,category:'Cardio',title:'',duration_minutes:'',distance_km:'',notes:'',test_key:'gainage',value:'',unit:'s',energy:3,fatigue:2,soreness:'',pain:'',exercises:[]});const [ex,setEx]=useState({name:'',sets:'',weight:'',reps:''});const change=(k,v)=>setForm(f=>({...f,[k]:v}));const submit=e=>{e.preventDefault();if(type==='entry')addRow('training_entries','entries',{...form,duration_minutes:form.duration_minutes?Number(form.duration_minutes):null,distance_km:form.distance_km?Number(form.distance_km):null});if(type==='plan')addRow('plans','plans',{date:form.date,title:form.title,category:form.category,status:'À faire',notes:form.notes});if(type==='test'){const t=initialTests.find(x=>x.key===form.test_key);addRow('test_results','tests',{test_key:t.key,test_label:t.label,value:Number(form.value),unit:t.unit,date:form.date,notes:form.notes});}if(type==='recovery')addRow('recovery_logs','recovery',{date:form.date,energy:Number(form.energy),fatigue:Number(form.fatigue),soreness:form.soreness,pain:form.pain,notes:form.notes});};const heading={entry:'Nouvelle séance',plan:'Planifier une séance',test:'Nouveau résultat SPV',recovery:'Relevé de récupération'}[type];return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">SPV TRAINING</div><h2>{heading}</h2></div><button onClick={close}><X/></button></div><form onSubmit={submit}><div className="form-grid"><label>Date<input type="date" value={form.date} onChange={e=>change('date',e.target.value)} required/></label>{(type==='entry'||type==='plan')&&<><label>Intitulé<input value={form.title} onChange={e=>change('title',e.target.value)} placeholder="Ex. Cardio + renforcement" required/></label><label>Catégorie<select value={form.category} onChange={e=>change('category',e.target.value)}>{['Cardio','Renforcement','Cardio + salle','Luc Léger','Natation','Récupération','Préparation physique'].map(x=><option>{x}</option>)}</select></label></>}{type==='entry'&&<><label>Durée (minutes)<input type="number" min="0" value={form.duration_minutes} onChange={e=>change('duration_minutes',e.target.value)}/></label><label>Distance totale (km)<input type="number" step=".01" min="0" value={form.distance_km} onChange={e=>change('distance_km',e.target.value)}/></label><div className="exercise-editor"><b>Ajouter un exercice (facultatif)</b><div className="exercise-fields"><input placeholder="Exercice" value={ex.name} onChange={e=>setEx({...ex,name:e.target.value})}/><input placeholder="Séries" value={ex.sets} onChange={e=>setEx({...ex,sets:e.target.value})}/><input placeholder="Charge kg" value={ex.weight} onChange={e=>setEx({...ex,weight:e.target.value})}/><input placeholder="Répétitions" value={ex.reps} onChange={e=>setEx({...ex,reps:e.target.value})}/><button type="button" onClick={()=>{if(ex.name.trim()){change('exercises',[...form.exercises,ex]);setEx({name:'',sets:'',weight:'',reps:''});}}}>Ajouter</button></div>{form.exercises.map((x,i)=><small key={i}>✓ {x.name} {x.sets} {x.weight&&'· '+x.weight+' kg'} {x.reps&&'· '+x.reps+' reps'}</small>)}</div></>}{type==='test'&&<><label>Épreuve<select value={form.test_key} onChange={e=>change('test_key',e.target.value)}>{initialTests.map(t=><option value={t.key}>{t.label}</option>)}</select></label><label>Résultat<input type="number" step=".1" min="0" value={form.value} onChange={e=>change('value',e.target.value)} required/></label></>}{type==='recovery'&&<><label>Énergie (1 à 5)<select value={form.energy} onChange={e=>change('energy',e.target.value)}>{[1,2,3,4,5].map(x=><option value={x}>{x}/5</option>)}</select></label><label>Fatigue (1 à 5)<select value={form.fatigue} onChange={e=>change('fatigue',e.target.value)}>{[1,2,3,4,5].map(x=><option value={x}>{x}/5</option>)}</select></label><label>Courbatures<input value={form.soreness} onChange={e=>change('soreness',e.target.value)} placeholder="Zone et intensité"/></label><label>Douleurs<input value={form.pain} onChange={e=>change('pain',e.target.value)} placeholder="Zone, côté, sensations"/></label></>}</div><label>Notes<textarea value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Sensations, détails, observations…"/></label><div className="modal-actions"><Button kind="ghost" onClick={close}>Annuler</Button><button className="btn primary" type="submit">Enregistrer</button></div></form></div></div>}
function SettingsModal({close,supabase,session,email,setEmail,password,setPassword,signIn,signUp,busy,msg,signOut,syncMsg}){return <div className="modal-backdrop" onMouseDown={close}><div className="modal settings-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">CONFIGURATION</div><h2>Compte & synchronisation</h2></div><button onClick={close}><X/></button></div>{!supabase?<div className="note-box"><b>Mode local activé</b><p>Le site fonctionne immédiatement sur cet appareil. Pour activer les comptes privés et la synchronisation, renseigne les variables Supabase dans le fichier .env.local et exécute le schéma SQL fourni.</p></div>:session?<><p className="success-line"><Cloud size={17}/> Connecté : {session.user.email}</p><p className="muted">{syncMsg}</p><Button kind="ghost" onClick={signOut}>Se déconnecter</Button></>:<form onSubmit={signIn}><p className="muted">Connecte-toi ou crée ton compte privé. Tes données seront isolées par utilisateur.</p><label>Adresse e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Mot de passe<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/></label><div className="modal-actions"><button type="button" className="btn ghost" disabled={busy} onClick={signUp}>Créer un compte</button><button className="btn primary" disabled={busy}>Connexion</button></div>{msg&&<p className="muted">{msg}</p>}</form>}</div></div>}
