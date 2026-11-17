import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Check, X, ZoomIn } from 'lucide-react';
import { driverAPI, errorMessage } from '@/lib/api';
import { useRealtime, useRealtimeEvents } from '@/lib/realtime';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Field } from '@/components/ui/dialog';
import { Stamp, EmptyTicket, RuledLines, Serial, timeAgo } from '@/components/ticket';
import { cn } from '@/lib/utils';

const DOCS = [['licenseFront', 'Driving licence — front'], ['licenseBack', 'Driving licence — back'], ['idProof', 'ID proof']];
const STATUS_STAMP = { pending: 'pending', approved: 'approved', rejected: 'rejected' };

const age = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Document photo fetched with the admin token (never a public URL). */
function DocumentPhoto({ driverId, kind, label, onZoom }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl;
    setUrl(null);
    setFailed(false);
    driverAPI.document(driverId, kind)
      .then((r) => { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl); })
      .catch(() => setFailed(true));
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [driverId, kind]);
  return (
    <figure>
      <button type="button" disabled={!url} onClick={() => onZoom({ url, label })}
        className="group relative block w-full aspect-[1.58] rounded-md border border-rule bg-paper overflow-hidden">
        {url && <img src={url} alt={label} className="w-full h-full object-cover" />}
        {!url && <span className="absolute inset-0 grid place-items-center text-[13px] text-ink-faint">{failed ? 'Not available' : 'Loading…'}</span>}
        {url && <span className="absolute inset-0 grid place-items-center bg-ink/0 group-hover:bg-ink/30 transition-colors"><ZoomIn className="text-counterfoil opacity-0 group-hover:opacity-100" /></span>}
      </button>
      <figcaption className="text-[13px] text-ink-soft mt-1.5">{label}</figcaption>
    </figure>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2 border-b border-rule last:border-0">
      <dt className="text-ink-faint text-[14px]">{label}</dt>
      <dd className="font-medium">{children || '—'}</dd>
    </div>
  );
}

function Review({ app, onDecided }) {
  const [zoom, setZoom] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const years = age(app.dateOfBirth);
  const expired = app.licenseExpiry && new Date(app.licenseExpiry) < new Date();

  const decide = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      setRejecting(false);
      onDecided();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article key={app._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[880px] mx-auto p-8">
      <div className="ticket p-8 relative">
        <div className="absolute top-6 right-6"><Stamp kind={STATUS_STAMP[app.status]} land className="text-[15px] px-3 py-0.5">{app.status}</Stamp></div>
        <Serial>Application · submitted {timeAgo(app.createdAt)}</Serial>
        <h2 className="text-[30px] font-bold leading-tight mt-1">{app.name}</h2>
        <p className="text-ink-soft">{[app.city, app.state].filter(Boolean).join(', ')}</p>

        <div className="grid md:grid-cols-2 gap-x-10 mt-6">
          <dl>
            <Row label="Age">{years != null && <>{years} <span className="text-ink-faint font-normal">· born {fmtDate(app.dateOfBirth)}</span></>}</Row>
            <Row label="Phone"><a className="underline underline-offset-2" href={`tel:${app.phone}`}>{app.phone}</a></Row>
            <Row label="Email">{app.email}</Row>
            <Row label="Address">{app.address}</Row>
            <Row label="Emergency contact">{app.emergencyContact?.name && `${app.emergencyContact.name} · ${app.emergencyContact.phone}`}</Row>
          </dl>
          <dl>
            <Row label="Licence number"><span className="tracking-wide">{app.licenseNumber}</span></Row>
            <Row label="Licence class">{app.licenseClass}</Row>
            <Row label="Licence valid till"><span className={cn(expired && 'text-signal')}>{fmtDate(app.licenseExpiry)}{expired && ' — expired'}</span></Row>
            <Row label="Experience">{app.experienceYears != null && `${app.experienceYears} years`}</Row>
            <Row label="ID type">{app.idType}</Row>
          </dl>
        </div>

        <h3 className="font-bold text-[18px] mt-8 mb-3">Documents</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {DOCS.map(([kind, label]) => app.documents?.[kind] && (
            <DocumentPhoto key={kind} driverId={app._id} kind={kind} label={label} onZoom={setZoom} />
          ))}
        </div>
        <p className="text-[13px] text-ink-faint mt-2">Check the licence number, name and photo match, and that the licence class allows transport vehicles.</p>

        {app.status === 'rejected' && app.reviewNote && (
          <p className="mt-6 p-3 rounded-md bg-rose text-rose-ink"><span className="font-semibold">Reason given:</span> {app.reviewNote}</p>
        )}

        {app.status === 'pending' && (
          <div className="flex gap-3 mt-8 pt-6 perf-h">
            <button type="button" className="btn btn-primary flex-1" disabled={busy || expired}
              onClick={() => decide(() => driverAPI.approve(app._id), `${app.name} approved — they can sign in now`)}>
              <Check size={18} /> Approve driver
            </button>
            <button type="button" className="btn btn-secondary flex-1" disabled={busy} onClick={() => setRejecting(true)}>
              <X size={18} /> Reject
            </button>
          </div>
        )}
        {app.status === 'pending' && expired && <p className="text-[13.5px] text-signal mt-2">The licence has expired, so this application can’t be approved.</p>}
      </div>

      <Dialog open={Boolean(zoom)} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent wide>
          <DialogHeader><DialogTitle>{zoom?.label}</DialogTitle></DialogHeader>
          {zoom && <img src={zoom.url} alt={zoom.label} className="w-full rounded-md border border-rule" />}
        </DialogContent>
      </Dialog>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {app.name}’s application?</DialogTitle>
            <DialogDescription>The applicant sees this reason in the driver app, so make it something they can act on.</DialogDescription>
          </DialogHeader>
          <Field label="Reason" hint="e.g. “Licence photo is blurred — please register again with a clear photo.”">
            <textarea className="field" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </Field>
          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || reason.trim().length < 3}
              onClick={() => decide(() => driverAPI.reject(app._id, reason.trim()), 'Application rejected')}>Reject application</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}

export default function DriverApplications() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { refreshSummary } = useRealtime();

  const load = (keepSelection = true) => driverAPI.applications(tab).then((r) => {
    setData(r.data);
    const ids = r.data.applications.map((a) => a._id);
    setSelectedId((cur) => (keepSelection && ids.includes(cur) ? cur : ids[0] || null));
  }).catch(() => setData({ applications: [], counts: {} }));

  useEffect(() => { setData(null); load(false); }, [tab]);
  useRealtimeEvents((event) => { if (event.startsWith('application:')) load(); });

  const apps = data?.applications || [];
  const selected = apps.find((a) => a._id === selectedId);

  return (
    <div className="h-full flex">
      <section className="w-[360px] flex-none border-r border-rule flex flex-col" aria-label="Applications">
        <div className="p-5 pb-3">
          <h1 className="text-[24px] font-bold">Driver applications</h1>
          <p className="text-ink-soft text-[14px]">People who registered in the driver app. Approve to let them sign in and be assigned a bus.</p>
          <div className="flex gap-1 mt-4 p-1 rounded-md bg-rule/40" role="tablist">
            {['pending', 'approved', 'rejected'].map((key) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={cn('flex-1 h-9 rounded-sm text-[14px] font-semibold capitalize transition-colors', tab === key ? 'bg-counterfoil shadow-rest' : 'text-ink-soft hover:text-ink')}>
                {key}{data?.counts?.[key] ? <span className="num ml-1.5 text-[14px]">{data.counts[key]}</span> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {data === null ? <div className="px-5"><RuledLines rows={6} /></div> : apps.length === 0 ? (
            <div className="p-5"><EmptyTicket title={tab === 'pending' ? 'No applications waiting' : `No ${tab} applications`}>
              {tab === 'pending' ? 'New registrations from the driver app show up here instantly.' : null}</EmptyTicket></div>
          ) : (
            <ul>
              <AnimatePresence initial={false}>
                {apps.map((a) => (
                  <motion.li key={a._id} layout exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                    <button type="button" onClick={() => setSelectedId(a._id)}
                      className={cn('w-full text-left px-5 py-3.5 border-b border-rule transition-colors', a._id === selectedId ? 'bg-counterfoil' : 'hover:bg-counterfoil/60')}>
                      <span className="flex justify-between gap-2">
                        <span className="font-semibold truncate">{a.name}</span>
                        <span className="text-[12.5px] text-ink-faint flex-none">{timeAgo(tab === 'pending' ? a.createdAt : a.reviewedAt)}</span>
                      </span>
                      <span className="block text-[13.5px] text-ink-soft truncate">{[a.city, a.experienceYears != null && `${a.experienceYears} yrs experience`].filter(Boolean).join(' · ')}</span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </section>
      <div className="flex-1 overflow-y-auto">
        {selected ? <Review app={selected} onDecided={() => { load(false); refreshSummary(); }} /> : (
          <div className="h-full grid place-items-center p-10"><EmptyTicket title="Nothing selected">Choose an application to review it.</EmptyTicket></div>
        )}
      </div>
    </div>
  );
}
