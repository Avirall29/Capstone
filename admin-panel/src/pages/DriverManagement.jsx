import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { driverAPI, errorMessage } from '@/lib/api';
import { useRealtime } from '@/lib/realtime';
import { PageHeader } from '@/components/Layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Field } from '@/components/ui/dialog';
import { Stamp, EmptyTicket, RuledLines, Serial } from '@/components/ticket';

const empty = { name: '', email: '', phone: '', licenseNumber: '', password: '' };

export default function DriverManagement() {
  const [drivers, setDrivers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { summary } = useRealtime();

  const load = () => driverAPI.getAll().then((r) => setDrivers(r.data)).catch((e) => { setDrivers([]); toast.error(errorMessage(e)); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editing._id) {
        const { password, ...rest } = editing;
        await driverAPI.update(editing._id, rest);
      } else {
        await driverAPI.create(editing);
      }
      toast.success(`${editing.name} saved`);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (d) => {
    try {
      await driverAPI.update(d._id, { isActive: !d.isActive });
      toast.success(d.isActive ? `${d.name} suspended — signed out of the driver app` : `${d.name} reactivated`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}? Their bus will be unassigned.`)) return;
    try {
      await driverAPI.delete(d._id);
      toast.success(`${d.name} deleted`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const valid = editing && editing.name.trim() && /\S+@\S+\.\S+/.test(editing.email) && editing.phone.trim() && editing.licenseNumber.trim() && (editing._id || editing.password.length >= 6);
  const pending = summary?.pendingApplications || 0;

  return (
    <>
      <PageHeader title="Drivers" actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Add driver</button>}>
        Approved drivers. New drivers usually register themselves in the driver app{pending > 0 && <> — <Link to="/applications" className="underline underline-offset-2 font-semibold">{pending} waiting for review</Link></>}.
      </PageHeader>

      {drivers === null ? <RuledLines rows={8} /> : drivers.length === 0 ? (
        <EmptyTicket title="No approved drivers yet">Approve applications from the driver app, or add a driver directly.</EmptyTicket>
      ) : (
        <div className="ticket overflow-x-auto">
          <table className="waybill">
            <thead><tr><th>Driver</th><th>Phone</th><th>Licence</th><th>Bus</th><th>Account</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d._id} className={d.isActive ? '' : 'opacity-60'}>
                  <td><div className="font-semibold">{d.name}</div><div className="text-[13px] text-ink-soft">{d.email}</div></td>
                  <td className="tabular-nums whitespace-nowrap">{d.phone}</td>
                  <td><Serial className="text-ink">{d.licenseNumber}</Serial></td>
                  <td>{d.assignedBus ? <span className="font-semibold">Bus {d.assignedBus.busNumber}</span> : <span className="text-ink-faint">Unassigned</span>}</td>
                  <td>
                    <button type="button" onClick={() => toggleActive(d)} title={d.isActive ? 'Suspend' : 'Reactivate'}>
                      <Stamp kind={d.isActive ? 'approved' : 'rejected'}>{d.isActive ? 'Active' : 'Suspended'}</Stamp>
                    </button>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button type="button" className="p-2 rounded-sm hover:bg-paper" aria-label={`Edit ${d.name}`}
                      onClick={() => setEditing({ _id: d._id, name: d.name, email: d.email, phone: d.phone, licenseNumber: d.licenseNumber, password: '' })}><Pencil size={16} /></button>
                    <button type="button" className="p-2 rounded-sm text-ink-faint hover:text-signal hover:bg-signal-stock" aria-label={`Delete ${d.name}`} onClick={() => remove(d)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?._id ? `Edit ${editing.name}` : 'Add a driver'}</DialogTitle>
            {!editing?._id && <DialogDescription>Drivers added here are approved immediately. Share the email and password with them privately.</DialogDescription>}
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" className="col-span-2"><input className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></Field>
              <Field label="Email"><input type="email" className="field" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Phone"><input type="tel" className="field" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Driving licence number" className={editing._id ? 'col-span-2' : ''}><input className="field uppercase" value={editing.licenseNumber} onChange={(e) => setEditing({ ...editing, licenseNumber: e.target.value.toUpperCase() })} /></Field>
              {!editing._id && <Field label="Password" hint="At least 6 characters"><input type="password" className="field" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></Field>}
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || !valid} onClick={save}>{busy ? 'Saving…' : 'Save driver'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
