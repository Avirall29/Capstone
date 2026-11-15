import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { busAPI, driverAPI, transitAPI, errorMessage } from '@/lib/api';
import { useRealtimeEvents } from '@/lib/realtime';
import { PageHeader } from '@/components/Layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Field } from '@/components/ui/dialog';
import { RouteBadge, Stamp, EmptyTicket, RuledLines, Serial, timeAgo } from '@/components/ticket';

const STATUS = {
  active: ['live', 'On trip'],
  inactive: ['stale', 'Parked'],
  maintenance: ['delayed', 'Maintenance'],
  breakdown: ['breakdown', 'Breakdown']
};
const empty = { busNumber: '', plateNumber: '', capacity: 50, route: '', status: 'inactive' };

export default function BusManagement() {
  const [buses, setBuses] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [editing, setEditing] = useState(null); // bus form state
  const [assigning, setAssigning] = useState(null); // bus
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => busAPI.getAll().then((r) => setBuses(r.data)).catch((e) => { setBuses([]); toast.error(errorMessage(e)); });
  useEffect(() => {
    load();
    driverAPI.getAll().then((r) => setDrivers(r.data)).catch(() => {});
    transitAPI.routes().then((r) => setRoutes(r.data)).catch(() => {});
  }, []);
  useRealtimeEvents((event) => { if (['trip-started', 'trip-ended', 'breakdown-alert'].includes(event)) load(); });

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...editing, capacity: Number(editing.capacity), route: editing.route || null };
      if (editing._id) await busAPI.update(editing._id, payload);
      else await busAPI.create(payload);
      toast.success(`Bus ${editing.busNumber} saved`);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (bus) => {
    if (!window.confirm(`Delete bus ${bus.busNumber}? Its driver will be unassigned.`)) return;
    try {
      await busAPI.delete(bus._id);
      toast.success(`Bus ${bus.busNumber} deleted`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const assign = async () => {
    setBusy(true);
    try {
      await busAPI.assignDriver(assigning._id, driverId);
      toast.success('Driver assigned');
      setAssigning(null);
      load();
      driverAPI.getAll().then((r) => setDrivers(r.data));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const formValid = editing && editing.busNumber.trim() && editing.plateNumber.trim() && Number(editing.capacity) > 0;

  return (
    <>
      <PageHeader title="Buses" actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Add bus</button>}>
        The fleet, the route each bus runs, and who drives it.
      </PageHeader>

      {buses === null ? <RuledLines rows={8} /> : buses.length === 0 ? (
        <EmptyTicket title="No buses yet" action={<button type="button" className="btn btn-primary" onClick={() => setEditing({ ...empty })}><Plus size={18} /> Add the first bus</button>}>
          Add a bus, give it a route, then assign an approved driver.
        </EmptyTicket>
      ) : (
        <div className="ticket overflow-x-auto">
          <table className="waybill">
            <thead>
              <tr><th>Bus</th><th>Route</th><th>Driver</th><th>Status</th><th>Last position</th><th className="text-right">Seats</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {buses.map((bus) => (
                <tr key={bus._id}>
                  <td><div className="font-bold">Bus {bus.busNumber}</div><Serial>{bus.plateNumber}</Serial></td>
                  <td>{bus.route ? <span className="flex items-center gap-2"><RouteBadge route={bus.route} size="sm" /><span className="text-[13.5px] text-ink-soft truncate max-w-[180px]">{bus.route.name}</span></span> : <span className="text-ink-faint">Not set</span>}</td>
                  <td>{bus.assignedDriver ? <span>{bus.assignedDriver.name}</span> : (
                    <button type="button" className="btn btn-sm btn-ghost -ml-3 text-ink-soft" onClick={() => { setAssigning(bus); setDriverId(''); }}><UserPlus size={15} /> Assign</button>
                  )}</td>
                  <td><Stamp kind={STATUS[bus.status][0]}>{STATUS[bus.status][1]}</Stamp></td>
                  <td className="text-ink-soft text-[13.5px]">{bus.live ? `${timeAgo(bus.live.lastUpdate)}${bus.live.nextStop ? ` · next ${bus.live.nextStop.name}` : ''}` : bus.currentLocation?.timestamp ? timeAgo(bus.currentLocation.timestamp) : '—'}</td>
                  <td className="text-right tabular-nums">{bus.capacity}</td>
                  <td className="text-right whitespace-nowrap">
                    {bus.assignedDriver && <button type="button" className="p-2 rounded-sm hover:bg-paper" title="Change driver" onClick={() => { setAssigning(bus); setDriverId(bus.assignedDriver._id); }}><UserPlus size={16} /></button>}
                    <button type="button" className="p-2 rounded-sm hover:bg-paper" aria-label={`Edit bus ${bus.busNumber}`}
                      onClick={() => setEditing({ _id: bus._id, busNumber: bus.busNumber, plateNumber: bus.plateNumber, capacity: bus.capacity, route: bus.route?._id || '', status: bus.status })}><Pencil size={16} /></button>
                    <button type="button" className="p-2 rounded-sm text-ink-faint hover:text-signal hover:bg-signal-stock" aria-label={`Delete bus ${bus.busNumber}`} onClick={() => remove(bus)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?._id ? `Edit bus ${editing.busNumber}` : 'Add a bus'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bus number"><input className="field" value={editing.busNumber} onChange={(e) => setEditing({ ...editing, busNumber: e.target.value })} autoFocus /></Field>
              <Field label="Number plate"><input className="field uppercase" value={editing.plateNumber} onChange={(e) => setEditing({ ...editing, plateNumber: e.target.value.toUpperCase() })} placeholder="PB65-AK-1234" /></Field>
              <Field label="Seats"><input type="number" min="1" className="field" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} /></Field>
              <Field label="Status">
                <select className="field" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {Object.entries(STATUS).map(([k, [, label]]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </Field>
              <Field label="Route" className="col-span-2" hint={routes.length === 0 ? 'Create routes in Routes & stops first.' : undefined}>
                <select className="field" value={editing.route} onChange={(e) => setEditing({ ...editing, route: e.target.value })}>
                  <option value="">No route</option>
                  {routes.map((r) => <option key={r._id} value={r._id}>{r.number} — {r.name}</option>)}
                </select>
              </Field>
            </div>
          )}
          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || !formValid} onClick={save}>{busy ? 'Saving…' : 'Save bus'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assigning)} onOpenChange={(o) => !o && setAssigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver for bus {assigning?.busNumber}</DialogTitle>
            <DialogDescription>Only approved, active drivers are listed. A driver drives one bus at a time.</DialogDescription>
          </DialogHeader>
          <Field label="Driver">
            <select className="field" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Choose a driver</option>
              {drivers.filter((d) => d.isActive).map((d) => (
                <option key={d._id} value={d._id}>{d.name}{d.assignedBus ? ` (now on bus ${d.assignedBus.busNumber})` : ''}</option>
              ))}
            </select>
          </Field>
          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => setAssigning(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || !driverId} onClick={assign}>Assign driver</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
