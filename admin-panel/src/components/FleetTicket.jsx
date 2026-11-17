import { routeStock } from '@shared/theme/tokens.js';
import { Ticket, RouteBadge, Stamp, StageStrip, Serial, busStamps, timeAgo } from './ticket';

/** One bus on the road: route + bus + driver, stamps, stage strip; next-stop minutes on the stub. */
export default function FleetTicket({ bus, route, selected, onClick, compact = false }) {
  const live = bus.live;
  const stock = routeStock(bus.route);
  const next = live?.nextStop;
  const stops = route?.stops || [];
  const nextIndex = next ? Math.max(0, stops.findIndex((s) => s.id === next.id)) : stops.length;

  return (
    <Ticket
      as="button"
      type="button"
      onClick={onClick}
      selected={selected}
      stubStock={stock}
      stub={next ? (
        <>
          <span className="num text-[40px]">{next.etaMinutes ?? '–'}</span>
          <span className="text-[12.5px] font-semibold -mt-0.5">min</span>
        </>
      ) : (
        <span className="text-[13px] font-semibold text-center leading-tight">End of<br />route</span>
      )}
    >
      <div className="flex items-start gap-3">
        <RouteBadge route={bus.route} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[17px]">Bus {bus.busNumber}</span>
            {busStamps(live, { status: bus.status }).map(([kind, label]) => (
              <Stamp key={kind} kind={kind} land>{label}</Stamp>
            ))}
          </div>
          <div className="flex items-baseline gap-2 text-[13.5px] text-ink-soft mt-0.5 min-w-0">
            <Serial className="flex-none">{bus.plateNumber}</Serial>
            <span className="truncate">
              {[bus.assignedDriver?.name, live?.lastUpdate ? `updated ${timeAgo(live.lastUpdate)}` : 'waiting for first position'].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
      </div>
      {!compact && stops.length > 1 && (
        <StageStrip className="mt-4" stops={stops} nextIndex={nextIndex} route={bus.route} showLabels />
      )}
      {compact && next && <p className="text-[13.5px] mt-2">Next: <span className="font-semibold">{next.name}</span></p>}
    </Ticket>
  );
}
