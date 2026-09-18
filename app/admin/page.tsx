'use client';
import {useEffect,useState} from 'react';
type Stats={leads:number;usLeads:number;spainLeads:number;users:number;pairs:number;completePairs:number;target:number;progress:number};
export default function Admin(){
 const[s,setS]=useState<Stats|null>(null);
 useEffect(()=>{fetch('/api/admin/stats').then(r=>r.json()).then(setS)},[]);
 return <main className="admin"><div className="logo">PAIR<span>VOICE</span> <small>GROWTH</small></div><h1>20,000 Lead Mission</h1>{!s?<p>Loading…</p>:<><div className="meter"><i style={{width:`${Math.min(s.progress,100)}%`}}/></div><strong className="progress">{s.leads.toLocaleString()} / {s.target.toLocaleString()} <em>{s.progress}%</em></strong><div className="stats"><article><b>{s.leads.toLocaleString()}</b><span>Email leads</span></article><article><b>{s.usLeads.toLocaleString()}</b><span>U.S. leads</span></article><article><b>{s.spainLeads.toLocaleString()}</b><span>Spain leads</span></article><article><b>{s.users.toLocaleString()}</b><span>Full accounts later</span></article></div></>}</main>
}
