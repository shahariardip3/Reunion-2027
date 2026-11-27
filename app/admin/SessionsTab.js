"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function SessionsTab() {
  const [sessions,setSessions]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const router=useRouter();
  async function load(){ const r=await fetch('/api/admin/sessions',{cache:'no-store'}); const d=await r.json().catch(()=>({})); if(!r.ok){setError(d.error||'Could not load sessions.');return;} setSessions(d.sessions||[]); }
  useEffect(()=>{load();},[]);
  async function revoke(id){ if(!confirm('Revoke this admin session? The device will be logged out on its next request.'))return; setBusy(id); const r=await fetch('/api/admin/sessions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:id})}); const d=await r.json().catch(()=>({})); setBusy(''); if(!r.ok){setError(d.error||'Could not revoke session.');return;} await load(); router.refresh(); }
  return <section className="card"><h2>Admin sessions</h2><p className="muted">Review recent logins and revoke a session if a device is no longer trusted.</p>{error&&<p className="error-panel">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Admin</th><th>Role</th><th>Created</th><th>Last active</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>{sessions.map(s=><tr key={s.session_id}><td>{s.username}</td><td>{s.role}</td><td>{new Date(s.created_at).toLocaleString()}</td><td>{new Date(s.last_seen_at).toLocaleString()}</td><td>{new Date(s.expires_at).toLocaleString()}</td><td>{s.revoked_at?'Revoked':new Date(s.expires_at)<new Date()?'Expired':'Active'}</td><td>{!s.revoked_at&&new Date(s.expires_at)>new Date()&&<button className="btn danger small" disabled={!!busy} onClick={()=>revoke(s.session_id)}>{busy===s.session_id?'Revoking…':'Revoke'}</button>}</td></tr>)}</tbody></table></div><button className="btn ghost" onClick={load}>Refresh</button></section>;
}
