/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Loader2, AlertCircle, ChevronLeft, ChevronRight, Ban, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { SectionCard, StatusBadge } from '@/components/admin/UIComponents';
import EmptyState from '@/components/common/EmptyState';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type TabType = 'schedule' | 'rules' | 'overrides' | 'closures';

export function AvailabilityClient() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data
  const [experiences, setExperiences] = useState<any[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [rules, setRules] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any>(null);
  
  const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  
  // Modals
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // Form State
  const [ruleForm, setRuleForm] = useState({ id: '', dayOfWeek: 1, time: '09:00', capacity: 12, isActive: true });
  const [overrideForm, setOverrideForm] = useState({ id: '', date: '', time: '09:00', capacity: 12, isBlocked: false, reason: '' });
  const [closureForm, setClosureForm] = useState({ id: '', date: '', reason: '' });
  const [genForm, setGenForm] = useState({ startHour: 9, endHour: 17, intervalMinutes: 120, capacity: 12 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/availability');
      const json = await res.json();
      if (json.success) {
        setRules(json.data.rules || []);
        setOverrides(json.data.overrides || []);
        setClosures(json.data.closures || []);
        
        // Extract unique experiences from rules for the dropdown
        const expsMap = new Map();
        (json.data.rules || []).forEach((r: any) => {
          if (r.experience) expsMap.set(r.experience.id, r.experience);
        });
        const exps = Array.from(expsMap.values());
        setExperiences(exps);
        if (exps.length > 0 && !selectedExpId) {
          setSelectedExpId(exps[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const end = new Date(scheduleWeekStart);
      end.setDate(end.getDate() + 6);
      const res = await fetch(`/api/admin/availability?view=schedule&startDate=${scheduleWeekStart}&endDate=${end.toISOString().split('T')[0]}`);
      const json = await res.json();
      if (json.success) setScheduleData(json.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'schedule') fetchSchedule();
    else fetchData();
  }, [activeTab, scheduleWeekStart]);

  const apiCall = async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/admin/availability/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchData();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  // HANDLERS
  const saveRule = async () => {
    if (!selectedExpId) return alert('Select an experience first');
    const action = ruleForm.id ? 'UPDATE_RULE' : 'CREATE_RULE';
    const success = await apiCall(action, { ...ruleForm, experienceId: selectedExpId });
    if (success) setShowRuleModal(false);
  };

  const deleteRule = async (id: string) => {
    if (confirm('Delete this session?')) {
      await apiCall('DELETE_RULE', { id });
    }
  };

  const saveOverride = async () => {
    if (!selectedExpId) return alert('Select an experience first');
    const action = overrideForm.id ? 'UPDATE_OVERRIDE' : 'CREATE_OVERRIDE';
    const success = await apiCall(action, { ...overrideForm, experienceId: selectedExpId });
    if (success) setShowOverrideModal(false);
  };

  const deleteOverride = async (id: string) => {
    if (confirm('Delete this override?')) {
      await apiCall('DELETE_OVERRIDE', { id });
    }
  };

  const saveClosure = async () => {
    if (!selectedExpId) return alert('Select an experience first');
    const success = await apiCall('CREATE_CLOSURE', { ...closureForm, experienceId: selectedExpId });
    if (success) setShowClosureModal(false);
  };

  const deleteClosure = async (id: string) => {
    if (confirm('Delete this closure?')) {
      await apiCall('DELETE_CLOSURE', { id });
    }
  };

  const generateRules = async () => {
    if (!selectedExpId) return alert('Select an experience first');
    const success = await apiCall('GENERATE_RULES', { ...genForm, experienceId: selectedExpId, isActive: true });
    if (success) setShowGenerateModal(false);
  };

  // FILTERED DATA
  const expRules = rules.filter(r => r.experienceId === selectedExpId);
  const expOverrides = overrides.filter(o => o.experienceId === selectedExpId);
  const expClosures = closures.filter(c => c.experienceId === selectedExpId);
  
  // GET EXPERIENCES MANUALLY IF NEEDED
  useEffect(() => {
    // If we need to load experiences without relying on rules
    fetch('/api/admin/availability?view=schedule&startDate=2020-01-01&endDate=2020-01-01')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data && j.data.experiences) {
           setExperiences(j.data.experiences);
           if (!selectedExpId && j.data.experiences.length > 0) {
             setSelectedExpId(j.data.experiences[0].id);
           }
        }
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 font-medium">Availability Management</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Theater-style explicit scheduling for experiences</p>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {[
          { key: 'schedule', label: 'Overview', icon: Calendar },
          { key: 'rules', label: 'Weekly Schedule', icon: Clock },
          { key: 'overrides', label: 'Date Overrides', icon: Users }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as TabType)} className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md ${activeTab === tab.key ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'schedule' && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <label className="text-sm font-medium text-stone-700 whitespace-nowrap">Manage Experience:</label>
          <select value={selectedExpId} onChange={e => setSelectedExpId(e.target.value)} className="flex-1 max-w-sm rounded-lg border-stone-300 text-sm focus:ring-[#8a3243] focus:border-[#8a3243]">
            {experiences.map(exp => <option key={exp.id} value={exp.id}>{exp.title}</option>)}
          </select>
          {activeTab === 'rules' && (
            <button onClick={() => setShowGenerateModal(true)} className="ml-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition">
              Auto-Generate Slots
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#8a3243]" /></div>
      ) : activeTab === 'rules' ? (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {DAY_NAMES.map((day, idx) => {
            const dayRules = expRules.filter(r => r.dayOfWeek === idx).sort((a, b) => a.time.localeCompare(b.time));
            return (
              <div key={day} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-[#faf8f5] px-4 py-3 border-b border-stone-200 flex justify-between items-center">
                  <h3 className="font-semibold text-sm text-stone-900">{day}</h3>
                  <button onClick={() => {
                    setRuleForm({ id: '', dayOfWeek: idx, time: '10:00', capacity: 12, isActive: true });
                    setShowRuleModal(true);
                  }} className="text-[#8a3243] hover:bg-[#8a3243]/10 p-1 rounded transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 space-y-2">
                  {dayRules.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4 italic">Closed</p>
                  ) : (
                    dayRules.map(rule => (
                      <div key={rule.id} className="p-3 bg-stone-50 rounded-lg border border-stone-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-medium text-stone-900">{rule.time}</span>
                          <div className="flex gap-1">
                            <button onClick={() => { setRuleForm(rule); setShowRuleModal(true); }} className="text-stone-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteRule(rule.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-stone-500">Cap: {rule.capacity}</span>
                          <StatusBadge status={rule.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === 'overrides' ? (
        <div className="space-y-6">
           <div className="flex gap-4">
             <button onClick={() => {
               setOverrideForm({ id: '', date: new Date().toISOString().split('T')[0], time: '10:00', capacity: 12, isBlocked: false, reason: '' });
               setShowOverrideModal(true);
             }} className="px-4 py-2 bg-[#8a3243] text-white text-sm font-medium rounded-lg hover:bg-[#6c2432] transition">
               + Add Date Override
             </button>
             <button onClick={() => {
               setClosureForm({ id: '', date: new Date().toISOString().split('T')[0], reason: 'Private Event' });
               setShowClosureModal(true);
             }} className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-black transition">
               + Close Entire Date
             </button>
           </div>
           
           <SectionCard title="Date Overrides">
             {expOverrides.length === 0 ? <EmptyState title="No Overrides" description="No date specific slot overrides configured." /> : (
               <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-stone-50"><th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Action</th><th className="p-3">Capacity</th><th className="p-3">Reason</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {expOverrides.map(ov => (
                      <tr key={ov.id}>
                        <td className="p-3">{new Date(ov.date).toLocaleDateString()}</td>
                        <td className="p-3 font-mono">{ov.time}</td>
                        <td className="p-3">{ov.isBlocked ? <span className="text-red-600 font-bold text-xs">BLOCKED</span> : <span className="text-emerald-600 font-bold text-xs">MODIFIED/ADDED</span>}</td>
                        <td className="p-3">{ov.capacity}</td>
                        <td className="p-3 text-stone-500">{ov.reason}</td>
                        <td className="p-3 flex gap-2">
                           <button onClick={() => { setOverrideForm(ov); setShowOverrideModal(true); }} className="text-stone-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                           <button onClick={() => deleteOverride(ov.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                     ))}
                  </tbody>
               </table>
             )}
           </SectionCard>

           <SectionCard title="Entire Day Closures">
             {expClosures.length === 0 ? <EmptyState title="No Closures" description="No entire day closures configured." /> : (
               <table className="w-full text-left text-sm border-collapse mt-4">
                  <thead>
                    <tr className="border-b bg-stone-50"><th className="p-3">Date</th><th className="p-3">Reason</th><th className="p-3">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {expClosures.map(c => (
                      <tr key={c.id}>
                        <td className="p-3">{new Date(c.date).toLocaleDateString()}</td>
                        <td className="p-3 text-stone-500">{c.reason}</td>
                        <td className="p-3 flex gap-2">
                           <button onClick={() => deleteClosure(c.id)} className="text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             )}
           </SectionCard>
        </div>
      ) : (
         <SectionCard 
           title="Weekly Schedule" 
           description="Overview of bookings and closures by day"
           action={
             <div className="flex items-center gap-2">
               <button onClick={() => {
                 const d = new Date(scheduleWeekStart); d.setDate(d.getDate() - 7); setScheduleWeekStart(d.toISOString().split('T')[0]);
               }} className="p-1 text-stone-500 hover:bg-stone-100 rounded-lg"><ChevronLeft className="w-4 h-4"/></button>
               <span className="text-xs font-mono text-stone-600">
                 {new Date(scheduleWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                 {' – '}
                 {new Date(new Date(scheduleWeekStart).getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
               </span>
               <button onClick={() => {
                 const d = new Date(scheduleWeekStart); d.setDate(d.getDate() + 7); setScheduleWeekStart(d.toISOString().split('T')[0]);
               }} className="p-1 text-stone-500 hover:bg-stone-100 rounded-lg"><ChevronRight className="w-4 h-4"/></button>
             </div>
           }
         >
           {!scheduleData || !scheduleData.experiences || scheduleData.experiences.length === 0 ? (
             <EmptyState title="No experiences configured" description="Configure experiences to see the schedule overview." />
           ) : (
             <div className="space-y-4">
               {scheduleData.experiences.map((exp: any) => {
                 const dayBookings = scheduleData.bookings ? scheduleData.bookings.filter(
                   (b: any) => b.items.some((item: any) => item.experienceId === exp.id)
                 ) : [];

                 const getWeekDays = () => {
                   return Array.from({ length: 7 }).map((_, i) => {
                     const d = new Date(scheduleWeekStart);
                     d.setDate(d.getDate() + i);
                     return d.toISOString().split('T')[0];
                   });
                 };

                 return (
                   <div key={exp.id} className="border border-stone-200/80 rounded-xl overflow-hidden">
                     <div className="px-4 py-3 bg-[#faf8f5] border-b border-stone-200/80">
                       <h3 className="font-serif font-medium text-sm text-stone-900">{exp.title}</h3>
                     </div>

                     <div className="grid grid-cols-7 divide-x divide-stone-100">
                       {getWeekDays().map((dateStr) => {
                         const date = new Date(dateStr + 'T12:00:00');
                         
                         // Check global winery closures
                         const isWineryClosed = scheduleData.closures && scheduleData.closures.some(
                           (c: any) => dateStr >= c.startDate.split('T')[0] && dateStr <= c.endDate.split('T')[0]
                         );

                         // Check experience specific closures (if we pulled them, but we might just use bookings data)
                         const isExpClosed = scheduleData.expClosures && scheduleData.expClosures.some(
                           (c: any) => c.experienceId === exp.id && c.date.split('T')[0] === dateStr
                         );

                         const dayBookingCount = dayBookings.filter((b: any) => b.date.split('T')[0] === dateStr).length;
                         const dayGuests = dayBookings
                           .filter((b: any) => b.date.split('T')[0] === dateStr)
                           .reduce((sum: number, b: any) => sum + b.totalGuests, 0);

                         return (
                           <div key={dateStr} className="p-2 text-center min-h-[80px]">
                             <p className="text-[10px] font-mono text-stone-500 uppercase">
                               {date.toLocaleDateString('en-US', { weekday: 'short' })}
                             </p>
                             <p className="text-xs font-medium text-stone-900">
                               {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                             </p>
                                                          {isWineryClosed || isExpClosed ? (
                               <div className="mt-1 flex justify-center">
                                 <StatusBadge status="CLOSED" size="sm" />
                               </div>
                             ) : (
                               <div className="mt-2 flex flex-col items-center gap-1 w-full">
                                 {(() => {
                                   const expRules = scheduleData.rules ? scheduleData.rules.filter((r: any) => r.experienceId === exp.id && r.dayOfWeek === date.getUTCDay()) : [];
                                   const dateOverrides = scheduleData.overrides ? scheduleData.overrides.filter((o: any) => o.experienceId === exp.id && o.date.split('T')[0] === dateStr) : [];
                                   
                                   const slotsMap = new Map();
                                   expRules.forEach((r: any) => slotsMap.set(r.time, { time: r.time, capacity: r.capacity }));
                                   dateOverrides.forEach((o: any) => {
                                     if (o.isBlocked) slotsMap.delete(o.time);
                                     else slotsMap.set(o.time, { time: o.time, capacity: o.capacity });
                                   });
                                   
                                   const slots = Array.from(slotsMap.values()).sort((a: any,b: any) => a.time.localeCompare(b.time));
                                   
                                   if (slots.length === 0) {
                                     return <span className="text-[10px] text-stone-400 mt-1">-</span>;
                                   }

                                   return (
                                     <div className="w-full space-y-1 mt-1">
                                       <div className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider mb-1 border-b pb-0.5 border-stone-200">
                                          {slots.length} Slots
                                       </div>
                                       {slots.map((slot: any) => {
                                         const slotBookings = dayBookings.filter((b: any) => b.date.split('T')[0] === dateStr && b.time === slot.time);
                                         const booked = slotBookings.reduce((sum: number, b: any) => sum + b.totalGuests, 0);
                                         const remaining = Math.max(0, slot.capacity - booked);
                                         
                                         return (
                                           <div key={slot.time} className="text-left bg-white border border-stone-200 rounded px-1.5 py-1 text-[10px] w-full relative group">
                                             <div className="flex justify-between font-mono font-medium text-stone-700">
                                               <span>{slot.time}</span>
                                               <span className={remaining === 0 ? 'text-red-600' : 'text-emerald-600'}>{remaining} L</span>
                                             </div>
                                             <div className="text-[9px] text-stone-400 flex justify-between mt-0.5">
                                               <span>B: {booked}</span>
                                               <span>C: {slot.capacity}</span>
                                             </div>
                                             {/* Tooltip */}
                                             <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max p-2 bg-stone-800 text-white text-[10px] rounded shadow-lg z-10 pointer-events-none">
                                               <div>Time: {slot.time}</div>
                                               <div>Capacity: {slot.capacity}</div>
                                               <div>Booked: {booked}</div>
                                               <div>Remaining: {remaining}</div>
                                             </div>
                                           </div>
                                         );
                                       })}
                                     </div>
                                   );
                                 })()}
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </SectionCard>
      )}

      {/* MODALS */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-serif">{ruleForm.id ? 'Edit Session' : 'Add Session'}</h3>
            <div><label className="block text-sm mb-1">Time (HH:mm)</label><input type="time" value={ruleForm.time} onChange={e => setRuleForm({...ruleForm, time: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="block text-sm mb-1">Capacity</label><input type="number" value={ruleForm.capacity} onChange={e => setRuleForm({...ruleForm, capacity: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm({...ruleForm, isActive: e.target.checked})} /> Active</label>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowRuleModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={saveRule} className="px-4 py-2 bg-[#8a3243] text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-serif">{overrideForm.id ? 'Edit Override' : 'Add Override'}</h3>
            <div><label className="block text-sm mb-1">Date</label><input type="date" value={overrideForm.date.split('T')[0]} onChange={e => setOverrideForm({...overrideForm, date: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="block text-sm mb-1">Time (HH:mm)</label><input type="time" value={overrideForm.time} onChange={e => setOverrideForm({...overrideForm, time: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="block text-sm mb-1">Capacity</label><input type="number" value={overrideForm.capacity} onChange={e => setOverrideForm({...overrideForm, capacity: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="block text-sm mb-1">Reason</label><input type="text" value={overrideForm.reason} onChange={e => setOverrideForm({...overrideForm, reason: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <label className="flex items-center gap-2 text-red-600 font-medium"><input type="checkbox" checked={overrideForm.isBlocked} onChange={e => setOverrideForm({...overrideForm, isBlocked: e.target.checked})} /> Block this session</label>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={saveOverride} className="px-4 py-2 bg-[#8a3243] text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {showClosureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-serif">Close Entire Date</h3>
            <div><label className="block text-sm mb-1">Date</label><input type="date" value={closureForm.date.split('T')[0]} onChange={e => setClosureForm({...closureForm, date: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div><label className="block text-sm mb-1">Reason</label><input type="text" value={closureForm.reason} onChange={e => setClosureForm({...closureForm, reason: e.target.value})} className="w-full border rounded-lg p-2" /></div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowClosureModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={saveClosure} className="px-4 py-2 bg-stone-900 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-serif">Auto-Generate Sessions</h3>
            <p className="text-xs text-stone-500">This will populate the weekly schedule for all 7 days with these intervals. You can delete unwanted ones later.</p>
            <div className="flex gap-4">
              <div className="flex-1"><label className="block text-sm mb-1">Start Hour</label><input type="number" value={genForm.startHour} onChange={e => setGenForm({...genForm, startHour: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div className="flex-1"><label className="block text-sm mb-1">End Hour</label><input type="number" value={genForm.endHour} onChange={e => setGenForm({...genForm, endHour: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1"><label className="block text-sm mb-1">Interval (Mins)</label><input type="number" value={genForm.intervalMinutes} onChange={e => setGenForm({...genForm, intervalMinutes: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
              <div className="flex-1"><label className="block text-sm mb-1">Capacity</label><input type="number" value={genForm.capacity} onChange={e => setGenForm({...genForm, capacity: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={generateRules} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
