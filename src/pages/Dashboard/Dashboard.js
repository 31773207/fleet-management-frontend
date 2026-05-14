import React, { useEffect, useMemo, useState } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import './Dashboard.css';
import { useVehicles } from '../../hooks/useVehicles';
import { useMissions } from '../../hooks/useMissions';
import { useMaintenances } from '../../hooks/useMaintenances';
import { useTechnicalChecks } from '../../hooks/useTechnicalChecks';
import { useDashboard } from '../../hooks/useDashboard';
import { useGasCoupons } from '../../hooks/useGasCoupons';
import SegmentedPeriod from '../../components/common/SegmentedPeriod';

/* ── helpers ── */
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86_400_000);
}
const AVATAR_COLORS = ['#4d7cfe', '#2ec4b6', '#7c6fe0', '#e67e22', '#2ecc71'];
function avatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function urgencyColor(days) {
  if (days <= 0)  return { text: '#e74c3c', bg: 'rgba(231,76,60,0.12)',  border: 'rgba(231,76,60,0.25)'  };
  if (days <= 15) return { text: '#e74c3c', bg: 'rgba(231,76,60,0.10)',  border: 'rgba(231,76,60,0.20)'  };
  if (days <= 30) return { text: '#f39c12', bg: 'rgba(243,156,18,0.10)', border: 'rgba(243,156,18,0.20)' };
  return              { text: '#f39c12', bg: 'rgba(243,156,18,0.07)', border: 'rgba(243,156,18,0.15)' };
}

/* ══════════════════════════════════════════════════════════════
   SECTION — Driver Performance (Top 5 + License Expiry only)
══════════════════════════════════════════════════════════════ */
function DriverPerformanceSection({ driverActivity, availableDrivers, missions }) {
  const top5 = useMemo(() => {
    if (Array.isArray(driverActivity) && driverActivity.length > 0) {
      return [...driverActivity]
        .sort((a, b) => (Number(b.totalMissions ?? b.missionCount ?? 0)) - (Number(a.totalMissions ?? a.missionCount ?? 0)))
        .slice(0, 5)
        .map((d) => ({
          id: d.driverId ?? d.id,
          name: d.driverName ?? d.name ?? '—',
          missions: Number(d.totalMissions ?? d.missionCount ?? 0),
          kmDriven: Number(d.totalKm ?? d.kmDriven ?? 0),
status: availableDrivers.some(ad => ad.id === (d.driverId ?? d.id)) ? 'available' : 'busy',
        }));
    }
    const counts = {};
    (missions ?? []).forEach((m) => {
      const key = m.driverId ?? m.driver?.id;
      if (!key) return;
      if (!counts[key]) counts[key] = { id: key, name: m.driverName ?? m.driver?.name ?? '—', missions: 0 };
      counts[key].missions += 1;
    });
    return Object.values(counts).sort((a, b) => b.missions - a.missions).slice(0, 5)
      .map((d) => ({ ...d, kmDriven: 0, status: 'unknown' }));
  }, [driverActivity, missions]);

  const maxMissions = top5.length ? Math.max(...top5.map((d) => d.missions), 1) : 1;

  const expiryWatch = useMemo(() => {
    return (Array.isArray(driverActivity) ? driverActivity : [])
      .map((d) => ({
        id: d.driverId ?? d.id,
        name: d.driverName ?? d.name ?? '—',
        expiry: d.licenseExpiry ?? d.licenseExpiryDate ?? null,
        days: daysUntil(d.licenseExpiry ?? d.licenseExpiryDate ?? null),
      }))
      .filter((d) => d.days !== null && d.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [driverActivity]);

  return (
    <div className="dp-grid">
      {/* Top 5 Drivers */}
      <div className="card dp-top5">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-trophy card-icon" /> Top 5 Drivers</div>
          <span className="card-badge">by missions</span>
        </div>
        {top5.length === 0 ? (
          <div className="dash-empty">No mission data yet.</div>
        ) : (
          <div className="dp-list">
            {top5.map((driver, idx) => (
              <div className="dp-row" key={driver.id ?? idx}>
                <div className={`dp-rank rank-${idx + 1}`}>#{idx + 1}</div>
                <div className="dp-avatar" style={{ background: avatarColor(driver.name) }}>
                  {initials(driver.name)}
                </div>
                <div className="dp-info">
                  <div className="dp-name">{driver.name}</div>
                  {driver.kmDriven > 0 && <div className="dp-sub">{driver.kmDriven.toLocaleString()} km</div>}
                </div>
                <div className="dp-bar-wrap">
                  <div className="dp-bar-track">
                    <div className="dp-bar-fill" style={{
                      width: `${(driver.missions / maxMissions) * 100}%`,
                      background: idx === 0 ? '#c9a84c' : avatarColor(driver.name),
                    }} />
                  </div>
                  <div className="dp-count">{driver.missions}</div>
                </div>
                <div className={`dp-badge dp-badge-${driver.status}`}>
                  {driver.status === 'available' ? 'Free' : driver.status === 'busy' ? 'Busy' : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* License Expiry Watch */}
      <div className="card dp-expiry">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-id-card card-icon" /> License Expiry</div>
          <span className="card-badge">next 60 days</span>
        </div>
        {expiryWatch.length === 0 ? (
          <div className="dash-empty dash-empty-ok">
            <i className="fas fa-check-circle" style={{ color: '#2ecc71', fontSize: 22, marginBottom: 8, display: 'block' }} />
            All licenses valid beyond 60 days.
          </div>
        ) : (
          <div className="expiry-list">
            {expiryWatch.map((d, idx) => {
              const c = urgencyColor(d.days);
              return (
                <div className="expiry-row" key={d.id ?? idx} style={{ background: c.bg, borderColor: c.border }}>
                  <div className="dp-avatar dp-avatar-sm" style={{ background: avatarColor(d.name) }}>
                    {initials(d.name)}
                  </div>
                  <div className="expiry-info">
                    <div className="dp-name">{d.name}</div>
                    <div className="dp-sub">{d.expiry ? new Date(d.expiry).toLocaleDateString('fr-DZ') : '—'}</div>
                  </div>
                  <div className="expiry-badge" style={{ color: c.text, borderColor: c.border }}>
                    {d.days <= 0 ? 'EXPIRED' : d.days === 1 ? '1 day' : `${d.days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION — Fuel Consumption
══════════════════════════════════════════════════════════════ */
function FuelSection({ coupons, driverActivity, missions }) {
  const fuel = useMemo(() => {
    const totalBought    = coupons.reduce((s, c) => s + Number(c.quantityBought ?? 0), 0);
    const totalRemaining = coupons.reduce((s, c) => s + Number(c.remaining ?? c.remainingQuantity ?? 0), 0);
    const totalUsed      = totalBought - totalRemaining;
    const usagePct       = totalBought > 0 ? Math.round((totalUsed / totalBought) * 100) : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const usedThisMonth = coupons.filter((c) => {
      const d = new Date(c.buyDate ?? c.purchaseDate ?? 0);
      return d >= startOfMonth;
    }).reduce((s, c) => s + Number(c.quantityBought ?? 0) - Number(c.remaining ?? c.remainingQuantity ?? 0), 0);

    const expiring = coupons
      .filter((c) => {
        const d = daysUntil(c.expiryDate ?? c.expiry);
        return d !== null && d <= 60 && d > 0 && String(c.status ?? '').toUpperCase() !== 'DEPLETED';
      })
      .sort((a, b) => daysUntil(a.expiryDate ?? a.expiry) - daysUntil(b.expiryDate ?? b.expiry))
      .slice(0, 4);

   const top5fuel = [...(Array.isArray(driverActivity) ? driverActivity : [])]
  .filter((d) => Number(d.totalReceived ?? d.assignedCoupons ?? d.coupons ?? 0) > 0)
  .sort((a, b) =>
    Number(b.totalReceived ?? b.assignedCoupons ?? b.coupons ?? 0) -
    Number(a.totalReceived ?? a.assignedCoupons ?? a.coupons ?? 0)
  )
  .slice(0, 5)
  .map((d) => ({
    name: d.driverName ?? d.name ?? '—',
    used: Number(d.totalReceived ?? d.assignedCoupons ?? d.coupons ?? 0),
  }));

    const maxFuel = top5fuel.length ? Math.max(...top5fuel.map((d) => d.used), 1) : 1;

    return { totalBought, totalRemaining, totalUsed, usagePct, usedThisMonth, expiring, top5fuel, maxFuel };
  }, [coupons, driverActivity]);

  return (
    <div className="fuel-grid">
      {/* KPI strip */}
      <div className="card fuel-kpi-card">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-gas-pump card-icon" /> Fuel Inventory</div>
          <span className="card-badge">coupons</span>
        </div>
        <div className="fuel-kpi-row">
          <div className="fuel-kpi-block">
            <div className="fuel-kpi-val" style={{ color: '#c9a84c' }}>{fuel.totalBought.toLocaleString()}</div>
            <div className="fuel-kpi-lbl">Total Bought</div>
          </div>
          <div className="fuel-kpi-divider" />
          <div className="fuel-kpi-block">
            <div className="fuel-kpi-val" style={{ color: '#2ec4b6' }}>{fuel.totalRemaining.toLocaleString()}</div>
            <div className="fuel-kpi-lbl">Available</div>
          </div>
          <div className="fuel-kpi-divider" />
          <div className="fuel-kpi-block">
            <div className="fuel-kpi-val" style={{ color: '#4d7cfe' }}>{fuel.totalUsed.toLocaleString()}</div>
            <div className="fuel-kpi-lbl">Used</div>
          </div>
          <div className="fuel-kpi-divider" />
          <div className="fuel-kpi-block">
            <div className="fuel-kpi-val" style={{ color: '#e67e22' }}>{fuel.usedThisMonth.toLocaleString()}</div>
            <div className="fuel-kpi-lbl">This Month</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 15, color: 'var(--dash-t2)', letterSpacing: 1, textTransform: 'uppercase' }}>Usage Rate</span>
            <span style={{ fontSize: 15, fontFamily: 'DM Mono, monospace', color: fuel.usagePct > 80 ? '#e74c3c' : '#2ecc71' }}>
              {fuel.usagePct}%
            </span>
          </div>
          <div className="fuel-track">
            <div className="fuel-fill" style={{
              width: `${fuel.usagePct}%`,
              background: fuel.usagePct > 80
                ? 'linear-gradient(90deg,#e74c3c,#c0392b)'
                : 'linear-gradient(90deg,#2ec4b6,#4d7cfe)',
            }} />
          </div>
        </div>
      </div>

      {/* Top 5 fuel consumers */}
      <div className="card fuel-top5-card">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-fire card-icon" /> Top Consumers</div>
          <span className="card-badge">drivers</span>
        </div>
        {fuel.top5fuel.length === 0 ? (
          <div className="dash-empty">No fuel consumption data yet.</div>
        ) : (
          <div className="dp-list">
            {fuel.top5fuel.map((d, idx) => (
              <div className="dp-row" key={idx}>
                <div className={`dp-rank rank-${idx + 1}`}>#{idx + 1}</div>
                <div className="dp-avatar" style={{ background: avatarColor(d.name) }}>{initials(d.name)}</div>
                <div className="dp-info"><div className="dp-name">{d.name}</div></div>
                <div className="dp-bar-wrap">
                  <div className="dp-bar-track">
                    <div className="dp-bar-fill" style={{
                      width: `${(d.used / fuel.maxFuel) * 100}%`,
                      background: idx === 0 ? '#e74c3c' : '#e67e22',
                    }} />
                  </div>
                  <div className="dp-count">{d.used}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expiring batches */}
      <div className="card fuel-expiry-card">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-clock card-icon" /> Expiring Batches</div>
          <span className="card-badge">next 60 days</span>
        </div>
        {fuel.expiring.length === 0 ? (
          <div className="dash-empty dash-empty-ok">
            <i className="fas fa-check-circle" style={{ color: '#2ecc71', fontSize: 22, marginBottom: 8, display: 'block' }} />
            No batches expiring soon.
          </div>
        ) : (
          <div className="expiry-list">
            {fuel.expiring.map((c, idx) => {
              const days = daysUntil(c.expiryDate ?? c.expiry);
              const col = urgencyColor(days);
              return (
                <div className="expiry-row" key={c.id ?? idx} style={{ background: col.bg, borderColor: col.border }}>
                  <div className="expiry-icon" style={{ color: col.text }}>
                    <i className="fas fa-ticket-alt" />
                  </div>
                  <div className="expiry-info">
                    <div className="dp-name" style={{ fontSize: 15 }}>{c.batchNumber ?? `Batch #${c.id}`}</div>
                    <div className="dp-sub">{Number(c.remaining ?? c.remainingQuantity ?? 0).toLocaleString()} remaining</div>
                  </div>
                  <div className="expiry-badge" style={{ color: col.text, borderColor: col.border ,fontSize: '15px'}}>
                    {days === 1 ? '1 day' : `${days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION — Maintenance + Tech Checks
══════════════════════════════════════════════════════════════ */
function MaintenanceSection({ maintenances, checks }) {
  const maint = useMemo(() => {
    const list = Array.isArray(maintenances) ? maintenances : [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const inProgress  = list.filter((m) => String(m.status ?? '').toUpperCase() === 'IN_PROGRESS').length;
    const scheduled   = list.filter((m) => String(m.status ?? '').toUpperCase() === 'SCHEDULED').length;
    const costMonth   = list
      .filter((m) => new Date(m.startDate ?? m.start ?? 0) >= startOfMonth)
      .reduce((s, m) => s + Number(m.cost ?? m.costDzd ?? 0), 0);

    const vCounts = {};
    list.forEach((m) => {
      const key = m.vehiclePlate ?? m.vehicle?.plateNumber ?? m.vehicleId ?? '—';
      vCounts[key] = (vCounts[key] ?? 0) + 1;
    });
    const mostMaintained = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0];

    const recent = [...list]
      .sort((a, b) => new Date(b.startDate ?? b.start ?? 0) - new Date(a.startDate ?? a.start ?? 0))
      .slice(0, 4);

    return { inProgress, scheduled, costMonth, mostMaintained, recent };
  }, [maintenances]);

  const techAlerts = useMemo(() => {
    return (Array.isArray(checks) ? checks : [])
      .map((c) => ({
        id: c.id,
        plate: c.vehiclePlate ?? c.vehicle?.plateNumber ?? c.vehicleId ?? '—',
        expiry: c.expiryDate ?? c.nextCheckDate ?? c.inspectionDate ?? null,
        days: daysUntil(c.expiryDate ?? c.nextCheckDate ?? c.inspectionDate ?? null),
        type: c.type ?? c.checkType ?? 'Inspection',
      }))
      .filter((c) => c.days !== null && c.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [checks]);

  const statusColor = (s) => {
    const st = String(s ?? '').toUpperCase();
    if (st === 'IN_PROGRESS') return { text: '#4d7cfe', bg: 'rgba(77,124,254,0.12)', border: 'rgba(77,124,254,0.25)' };
    if (st === 'SCHEDULED')   return { text: '#f39c12', bg: 'rgba(243,156,18,0.12)', border: 'rgba(243,156,18,0.25)' };
    if (st === 'COMPLETED')   return { text: '#2ecc71', bg: 'rgba(39,174,96,0.12)',  border: 'rgba(39,174,96,0.25)'  };
    return { text: '#aaa', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
  };

  return (
    <div className="maint-grid">
      {/* Cost summary */}
      <div className="card maint-summary-card">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-tools card-icon" /> Maintenance Summary</div>
          <span className="card-badge">this month</span>
        </div>
        <div className="maint-kpi-row">
          <div className="maint-kpi-block">
            <div className="maint-kpi-val" style={{ color: '#c9a84c' }}>
              {maint.costMonth.toLocaleString()} <span style={{ fontSize: 13 }}>DZD</span>
            </div>
            <div className="maint-kpi-lbl">Total Cost</div>
          </div>
          <div className="fuel-kpi-divider" />
          <div className="maint-kpi-block">
            <div className="maint-kpi-val" style={{ color: '#4d7cfe' }}>{maint.inProgress}</div>
            <div className="maint-kpi-lbl">In Progress</div>
          </div>
          <div className="fuel-kpi-divider" />
          <div className="maint-kpi-block">
            <div className="maint-kpi-val" style={{ color: '#f39c12' }}>{maint.scheduled}</div>
            <div className="maint-kpi-lbl">Scheduled</div>
          </div>
        </div>
        {maint.mostMaintained && (
          <div className="maint-most">
            <i className="fas fa-car" style={{ color: '#c9a84c', marginRight: 8 }} />
            <span style={{ color: 'var(--dash-t2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
              Most maintained:&nbsp;
            </span>
            <span style={{ color: 'var(--dash-t1)', fontFamily: 'DM Mono,monospace', fontSize: 15 }}>
              {maint.mostMaintained[0]}
            </span>
            <span style={{ color: 'var(--dash-t3)', fontFamily: 'DM Mono,monospace', fontSize: 12, marginLeft: 6 }}>
              ×{maint.mostMaintained[1]}
            </span>
          </div>
        )}
        <div className="maint-recent-list">
          {maint.recent.length === 0 ? (
            <div className="dash-empty">No maintenance records.</div>
          ) : maint.recent.map((m, idx) => {
            const sc = statusColor(m.status);
            return (
              <div className="maint-row" key={m.id ?? idx}>
                <div className="maint-row-plate">{m.vehiclePlate ?? m.vehicle?.plateNumber ?? '—'}</div>
                <div className="maint-row-type">{m.type ?? m.maintenanceType ?? '—'}</div>
                <div className="maint-row-badge" style={{ color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                  {m.status ?? '—'}
                </div>
                <div className="maint-row-cost">
                  {Number(m.cost ?? m.costDzd ?? 0).toLocaleString()} DZD
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tech check alerts */}
      <div className="card maint-tech-card">
        <div className="card-hdr">
          <div className="card-title"><i className="fas fa-clipboard-check card-icon" /> Tech Check Alerts</div>
          <span className="card-badge">next 60 days</span>
        </div>
        {techAlerts.length === 0 ? (
          <div className="dash-empty dash-empty-ok">
            <i className="fas fa-check-circle" style={{ color: '#2ecc71', fontSize: 22, marginBottom: 8, display: 'block' }} />
            All inspections up to date.
          </div>
        ) : (
          <div className="expiry-list">
            {techAlerts.map((c, idx) => {
              const col = urgencyColor(c.days);
              return (
                <div className="expiry-row" key={c.id ?? idx} style={{ background: col.bg, borderColor: col.border   }}>
                  <div className="expiry-icon" style={{ color: col.text }}>
                    <i className="fas fa-car" />
                  </div>
                  <div className="expiry-info">
                    <div className="dp-name">{c.plate}</div>
                    <div className="dp-sub">{c.type} · {c.expiry ? new Date(c.expiry).toLocaleDateString('fr-DZ') : '—'}</div>
                  </div>
                  <div className="expiry-badge" style={{ color: col.text, borderColor: col.border }}>
                    {c.days <= 0 ? 'EXPIRED' : c.days === 1 ? '1 day' : `${c.days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECTION — Recent Activity Feed
══════════════════════════════════════════════════════════════ */
function ActivityFeed({ missions, maintenances, coupons }) {
  const feed = useMemo(() => {
    const items = [];

    const sortedMissions = [...(Array.isArray(missions) ? missions : [])]
      .sort((a, b) => new Date(b.startDate ?? b.createdAt ?? 0) - new Date(a.startDate ?? a.createdAt ?? 0))
      .slice(0, 3);
    sortedMissions.forEach((m) => {
      const s = String(m.status ?? '').toUpperCase();
      items.push({
        type: 'mission',
        icon: 'fa-route',
        color: s === 'IN_PROGRESS' ? '#4d7cfe' : s === 'COMPLETED' ? '#2ecc71' : '#f39c12',
        title: `Mission #${m.id ?? '—'}`,
        sub: `${m.departureLocation ?? m.depart ?? '—'} → ${m.destination ?? '—'}`,
        status: m.status ?? '—',
        date: m.startDate ?? m.createdAt ?? null,
      });
    });

    const sortedMaint = [...(Array.isArray(maintenances) ? maintenances : [])]
      .sort((a, b) => new Date(b.startDate ?? b.start ?? 0) - new Date(a.startDate ?? a.start ?? 0))
      .slice(0, 3);
    sortedMaint.forEach((m) => {
      items.push({
        type: 'maintenance',
        icon: 'fa-tools',
        color: '#e67e22',
        title: `Maintenance — ${m.vehiclePlate ?? m.vehicle?.plateNumber ?? '—'}`,
        sub: m.type ?? m.maintenanceType ?? '—',
        status: m.status ?? '—',
        date: m.startDate ?? m.start ?? null,
      });
    });

    const sortedCoupons = [...(Array.isArray(coupons) ? coupons : [])]
      .sort((a, b) => new Date(b.buyDate ?? b.purchaseDate ?? 0) - new Date(a.buyDate ?? a.purchaseDate ?? 0))
      .slice(0, 2);
    sortedCoupons.forEach((c) => {
      items.push({
        type: 'coupon',
        icon: 'fa-gas-pump',
        color: '#2ec4b6',
        title: `Coupon Batch — ${c.batchNumber ?? `#${c.id}`}`,
        sub: `${Number(c.quantityBought ?? 0).toLocaleString()} coupons purchased`,
        status: c.status ?? 'AVAILABLE',
        date: c.buyDate ?? c.purchaseDate ?? null,
      });
    });

    return items
      .sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))
      .slice(0, 8);
  }, [missions, maintenances, coupons]);

  const statusPill = (status, color) => (
    <span style={{
      fontSize: 16, fontFamily: 'DM Mono,monospace', padding: '2px 7px',
      borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5,
      color, background: `${color}18`, border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  );

  return (
    <div className="card activity-card">
      <div className="card-hdr">
        <div className="card-title"><i className="fas fa-stream card-icon" /> Recent Activity</div>
        <span className="card-badge">latest events</span>
      </div>
      {feed.length === 0 ? (
        <div className="dash-empty">No recent activity.</div>
      ) : (
        <div className="activity-list">
          {feed.map((item, idx) => (
            <div className="activity-row" key={idx}>
              <div className="activity-icon-wrap" style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}>
                <i className={`fas ${item.icon}`} style={{ color: item.color, fontSize: 18 }} />
              </div>
              <div className="activity-info">
                <div className="activity-title">{item.title}</div>
                <div className="activity-sub">{item.sub}</div>
              </div>
              <div className="activity-right">
                {statusPill(item.status, item.color)}
                {item.date && (
                  <div className="activity-date">
                    {new Date(item.date).toLocaleDateString('fr-DZ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════ */
function Dashboard() {
  const [time, setTime] = useState('');
  const [missionPeriod, setMissionPeriod] = useState('month');

  const { vehicles, fetchVehicles } = useVehicles();
  const { missions, fetchMissions, availableDrivers } = useMissions();
  const { maintenances, fetchMaintenances } = useMaintenances();
  const { checks, fetchChecks } = useTechnicalChecks();
  const { coupons, fetchCoupons } = useGasCoupons();
  const { driverActivity, fetchMissionsReport, fetchDriverActivity } = useDashboard();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchMissions();
    fetchMaintenances();
    fetchChecks();
    fetchCoupons();
    fetchMissionsReport();
    fetchDriverActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computed = useMemo(() => {
    const totalVehicles = vehicles.length;
    const activeMissions = missions.filter((m) => {
      const s = String(m.status || '').toUpperCase();
      return s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'STARTED' || s === 'ACTIVE';
    }).length;
    const availableDriverCount = availableDrivers.length;

    // ── FIXED: pendingAlerts now includes VALID checks expiring within 15 days ──
    const pendingAlerts = [...maintenances, ...checks].filter((x) => {
      const s = String(x.status || x.state || x.technicalCheckStatus || '').toUpperCase();
const days = daysUntil(x.endDate ?? x.scheduledDate ?? x.startDate);
      return (
        s.includes('EXPIRE') ||
        s.includes('EXPIR')  ||
        s.includes('WARNING')||
        s.includes('BREAK')  ||
        s.includes('MAINT')  ||
        (days !== null && days <= 15)
      );
    }).length;

   const fleetStatus = {
  active: vehicles.filter((v) => {
    const status = String(v.status).toUpperCase();
    return status === 'AVAILABLE' || status === 'REFORMED';
  }).length,
  assigned: vehicles.filter((v) => {
    const status = String(v.status).toUpperCase();
    return status === 'IN_MISSION';
  }).length,
  maintenance: vehicles.filter((v) => {
    const status = String(v.status).toUpperCase();
    return status === 'IN_REVISION';
  }).length,
  breakdown: vehicles.filter((v) => {
    const status = String(v.status).toUpperCase();
    return status === 'BREAKDOWN';
  }).length,
};
    return { totalVehicles, activeMissions, availableDriverCount, pendingAlerts, fleetStatus };
  }, [vehicles, missions, availableDrivers, maintenances, checks]);

  const missionCounts = useMemo(() => {
    const list = Array.isArray(missions) ? missions : [];
    return {
      inProgress: list.filter((m) => String(m.status ?? '').toUpperCase() === 'IN_PROGRESS').length,
      planned:    list.filter((m) => String(m.status ?? '').toUpperCase() === 'PLANNED').length,
      completed:  list.filter((m) => String(m.status ?? '').toUpperCase() === 'COMPLETED').length,
      cancelled:  list.filter((m) => String(m.status ?? '').toUpperCase() === 'CANCELLED').length,
    };
  }, [missions]);

  return (
    <PageLayout>
      <div className="dash">

        {/* ── Header ── */}
        <div className="content-header">
          <div>
            <h2>Dashboard</h2>
            <span style={{ fontSize: 10, color: 'rgba(160,185,220,0.55)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'DM Mono',monospace", marginTop: 4, display: 'block' }}>
              Bank of Algeria · Fleet Management
            </span>
          </div>
          <div className="dash-live-box">
            <div className="pulse" />
            <span className="dash-live-text">Live Monitoring</span>
            <span className="dash-live-sep">|</span>
            <span className="dash-live-time">{time}</span>
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="kpi-row">
          <div className="kpi k1">
            <div className="kpi-label"><i className="fas fa-car" /> Total Vehicles</div>
            <div className="kpi-val">{computed.totalVehicles}</div>
          </div>
          <div className="kpi k2">
            <div className="kpi-label"><i className="fas fa-route" /> Active Missions</div>
            <div className="kpi-val">{computed.activeMissions}</div>
          </div>
          <div className="kpi k3">
            <div className="kpi-label"><i className="fas fa-users" /> Available Drivers</div>
            <div className="kpi-val">{computed.availableDriverCount}</div>
          </div>
          <div className="kpi k4">
            <div className="kpi-label"><i className="fas fa-exclamation-triangle" /> Pending Alerts</div>
            <div className="kpi-val">{computed.pendingAlerts}</div>
          </div>
        </div>

        {/* ── Fleet + Mission row ── */}
        <div className="main-grid">
          <div className="card">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-chart-pie card-icon" /> Fleet Status</div>
              <span className="card-badge">{computed.totalVehicles} vehicles</span>
            </div>
            <div className="donut-wrap">
              <svg className="donut-svg" width="110" height="110" viewBox="0 0 110 110">
                {(() => {
                  const circumference = 2 * Math.PI * 40;
                  const total = Math.max(1, computed.totalVehicles);
                  const a = computed.fleetStatus;
                  const segments = [
                    { val: a.active, color: '#2ec4b6' },
                    { val: a.assigned, color: '#4d7cfe' },
                    { val: a.maintenance, color: '#e67e22' },
                    { val: a.breakdown, color: '#e74c3c' },
                  ];
                  let offsetAngle = -62.8;
                  return (
                    <>
                      <circle cx="55" cy="55" r="40" fill="none" stroke="rgba(99,140,255,0.10)" strokeWidth="14" />
                      {segments.map((seg, i) => {
                        if (Number(seg.val) === 0) return null;
                        const dash = (Number(seg.val) / total) * circumference;
                        const gap = circumference - dash;
                        const offset = offsetAngle;
                        offsetAngle -= dash;
                        return <circle key={i} cx="55" cy="55" r="40" fill="none" stroke={seg.color} strokeWidth="14" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} strokeLinecap="round" />;
                      })}
                    </>
                  );
                })()}
                <text x="55" y="50" textAnchor="middle" fontFamily="DM Mono,monospace" fontSize="20" fill="rgba(235,240,255,0.95)" fontWeight="500">{computed.totalVehicles}</text>
                <text x="55" y="63" textAnchor="middle" fontFamily="Rajdhani,sans-serif" fontSize="12" fill="rgba(190, 217, 253, 0.66)" letterSpacing="1.5">TOTAL</text>
              </svg>
              <div className="donut-legend">
                {[
                  { label: 'Active', val: computed.fleetStatus.active, color: '#2ec4b6' },
                  { label: 'Assigned', val: computed.fleetStatus.assigned, color: '#4d7cfe' },
                  { label: 'Maintenance', val: computed.fleetStatus.maintenance, color: '#e67e22' },
                  { label: 'Breakdown', val: computed.fleetStatus.breakdown, color: '#e74c3c' },
                ].flatMap((it) => {
                  const pct = Math.round((it.val / Math.max(1, computed.totalVehicles)) * 100);
                  return [
                    <div className="leg-row" key={`${it.label}-r`}>
                      <div className="leg-dot" style={{ background: it.color }} />
                      <div className="leg-label">{it.label}</div>
                      <div className="leg-val">{it.val}</div>
                    </div>,
                    <div className="leg-bar" key={`${it.label}-b`}>
                      <div className="leg-bar-fill" style={{ width: `${pct}%`, background: it.color }} />
                    </div>,
                  ];
                })}
              </div>
            </div>
          </div>

          <div className="card span2">
            <div className="card-hdr">
              <div className="card-title"><i className="fas fa-map-marked-alt card-icon" /> Mission Status Overview</div>
              <span className="card-badge">{missionPeriod}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", color: 'rgba(120,150,190,0.50)', fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase' }}>Missions by</div>
              <SegmentedPeriod value={missionPeriod} onChange={setMissionPeriod} />
            </div>
            <div className="mission-grid">
              <div className="ms-item">
                <div className="ms-label">In Progress</div>
                <div className="ms-val">{missionCounts.inProgress}</div>
                <div className="ms-pill blue">Active now</div>
              </div>
              <div className="ms-item">
                <div className="ms-label">Planned</div>
                <div className="ms-val">{missionCounts.planned}</div>
                <div className="ms-pill gold">Scheduled</div>
              </div>
              <div className="ms-item">
                <div className="ms-label">Completed</div>
                <div className="ms-val">{missionCounts.completed}</div>
                <div className="ms-pill green">Done</div>
              </div>
              <div className="ms-item">
                <div className="ms-label">Cancelled</div>
                <div className="ms-val">{missionCounts.cancelled}</div>
                <div className="ms-pill red">Requires review</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Driver Performance ── */}
        <div className="section-title-row">
          <i className="fas fa-steering-wheel section-title-icon" />
          <span>Driver Performance</span>
        </div>
        <DriverPerformanceSection
          driverActivity={driverActivity}
          availableDrivers={availableDrivers}
          missions={missions}
        />

        {/* ── Section: Fuel Consumption ── */}
        <div className="section-title-row">
          <i className="fas fa-gas-pump section-title-icon" />
          <span>Fuel Consumption</span>
        </div>
        <FuelSection coupons={coupons} driverActivity={driverActivity} missions={missions} />

        {/* ── Section: Maintenance & Tech Checks ── */}
        <div className="section-title-row">
          <i className="fas fa-tools section-title-icon" />
          <span>Maintenance & Technical Checks</span>
        </div>
        <MaintenanceSection maintenances={maintenances} checks={checks} />

        {/* ── Section: Recent Activity ── */}
        <div className="section-title-row">
          <i className="fas fa-stream section-title-icon" />
          <span>Recent Activity</span>
        </div>
        <ActivityFeed missions={missions} maintenances={maintenances} coupons={coupons} />

      </div>
    </PageLayout>
  );
}

export default Dashboard;