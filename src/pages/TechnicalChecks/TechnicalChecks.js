import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageLayout from '../../components/layout/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import { AddButton, EditButton, DeleteButton } from '../../components/common/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { DataTable } from '../../components/common/DataTable';
import { canEdit } from '../../utils/roles';
import { TechnicalCheckModal } from '../../components/common/TechnicalCheckModal';
import { useConfirm } from '../../hooks/useConfirm';
import './TechnicalChecks.css';

const FILTER_TABS = ['All', 'VALID', 'EXPIRED', 'FAILED', 'Expiring Soon'];

const daysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
};

function TechnicalChecks() {
  const [checks, setChecks]           = useState([]);
  const [vehicles, setVehicles]       = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [editCheck, setEditCheck]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('All');
  const [search, setSearch]           = useState('');

  const { confirmState, showConfirm, hideConfirm } = useConfirm();
  const { addToast } = useToast();

  useEffect(() => {
    fetchChecks();
    fetchVehicles();
    fetchExpiringSoon();
  }, []);

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/technical-checks');
      setChecks(res.data);
    } catch {
      addToast('Error fetching technical checks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchExpiringSoon = async () => {
    try {
      const res = await api.get('/technical-checks/expiring-soon');
      setExpiringSoon(res.data);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (check) => {
    setEditCheck(check);
    setShowForm(true);
  };

  const handleDelete = (id, plateNumber) => {
    showConfirm(
      'Delete Technical Check',
      `Delete technical check for vehicle "${plateNumber}"?`,
      async () => {
        await api.delete(`/technical-checks/${id}`);
        await fetchChecks();
        await fetchExpiringSoon();
      },
      'danger'
    );
  };

  // ── Stats ──────────────────────────────────────────────
  const total        = checks.length;
  const validCount   = checks.filter(c => c.status === 'VALID').length;
  const expiredCount = checks.filter(c => c.status === 'EXPIRED').length;
  const failedCount  = checks.filter(c => c.status === 'FAILED').length;
  const soonCount    = checks.filter(c => {
    const d = daysUntilExpiry(c.expiryDate);
    return c.status === 'VALID' && d !== null && d >= 0 && d <= 15;
  }).length;

  // ── Filtering ──────────────────────────────────────────
  const filtered = checks.filter(c => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      c.vehicle?.plateNumber?.toLowerCase().includes(term) ||
      c.center?.toLowerCase().includes(term) ||
      c.status?.toLowerCase().includes(term) ||
      c.notes?.toLowerCase().includes(term);

    if (!matchSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'Expiring Soon') {
      const d = daysUntilExpiry(c.expiryDate);
      return c.status === 'VALID' && d !== null && d >= 0 && d <= 15;
    }
    return c.status === filter;
  });

  // ── Columns ────────────────────────────────────────────
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (value, row) => (
        <div>
          <span className="mission-id">#{value}</span>
          {row.checkDate && (
            <div className="mission-timestamp">
              {new Date(row.checkDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (value) => (
        <div>
          <span className="tc-plate">{value?.plateNumber || '—'}</span>
          {value?.model && <div className="mission-timestamp">{value.model}</div>}
        </div>
      ),
    },
    { key: 'checkDate',  label: 'Check Date',  render: (v) => v ? new Date(v).toLocaleDateString('en-GB') : '—' },
    { key: 'expiryDate', label: 'Expiry Date', render: (v) => v ? new Date(v).toLocaleDateString('en-GB') : '—' },
    {
      key: 'expiryDate',
      label: 'Days Left',
      render: (v) => {
        const d = daysUntilExpiry(v);
        if (d === null) return '—';
        if (d < 0)      return <span className="tc-days tc-days--overdue">{Math.abs(d)}d ago</span>;
        if (d <= 15)    return <span className="tc-days tc-days--soon">{d}d</span>;
        return <span className="tc-days tc-days--ok">{d}d</span>;
      },
    },
    {
      key: 'center',
      label: 'Center',
      render: (v) => v || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        const map = {
          VALID:   'badge-valid',
          EXPIRED: 'badge-expired',
          FAILED:  'badge-fail',
        };
        return (
          <span className={`mission-badge ${map[value] || 'badge-pending'}`}>
            {value || '—'}
          </span>
        );
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (v) => v || '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) =>
        !canEdit() ? (
          <span style={{ color: '#888' }}>—</span>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <EditButton onClick={() => handleEdit(row)} />
            <DeleteButton
              onClick={() => handleDelete(row.id, row.vehicle?.plateNumber)}
              itemName={`check for ${row.vehicle?.plateNumber}`}
            />
          </div>
        ),
    },
  ];

  return (
    <PageLayout>
      {/* Header */}
      <div className="content-header">
        <h2>Technical Checks</h2>
        {canEdit() && (
          <AddButton
            onClick={() => { setEditCheck(null); setShowForm(true); }}
          >
            + New Check
          </AddButton>
        )}
      </div>

      <div className="content-body">

        {/* ── Stat Cards ── */}
        <div className="tc-stats-row">
          <div className="tc-kpi k1">
            <div className="tc-kpi-label"><i className="fas fa-clipboard-check" /> TOTAL CHECKS</div>
            <div className="tc-kpi-val">{total}</div>
          </div>
          <div className="tc-kpi k2">
            <div className="tc-kpi-label"><i className="fas fa-circle-check" /> VALID</div>
            <div className="tc-kpi-val">{validCount}</div>
          </div>
          <div className="tc-kpi k3">
            <div className="tc-kpi-label"><i className="fas fa-triangle-exclamation" /> EXPIRING SOON</div>
            <div className="tc-kpi-val">{soonCount}</div>
          </div>
          <div className="tc-kpi k4">
            <div className="tc-kpi-label"><i className="fas fa-circle-xmark" /> EXPIRED</div>
            <div className="tc-kpi-val">{expiredCount}</div>
          </div>
        </div>

        {/* ── Expiring-Soon Banner ── */}
        {expiringSoon.length > 0 && (
          <div className="tc-expiry-banner">
            <span className="tc-expiry-icon">⚠</span>
            <strong>Expiring Soon:</strong>
            <span className="tc-expiry-list">
              {expiringSoon.map((c, i) => (
                <span key={c.id} className="tc-expiry-item">
                  {c.vehicle?.plateNumber} — {new Date(c.expiryDate).toLocaleDateString('en-GB')}
                  {i < expiringSoon.length - 1 && ',  '}
                </span>
              ))}
            </span>
          </div>
        )}

        {/* ── Filter Tabs + Search ── */}
        <div className="filters">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              className={`filter-btn ${filter === tab ? 'active-filter' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'Expiring Soon' ? 'EXPIRING SOON' : tab.toUpperCase()}
            </button>
          ))}
          <input
            className="search-input"
            placeholder="Search by vehicle, center…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ── Table ── */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filtered}
              emptyMessage="No technical checks found."
            />
            <div className="tc-footer">
              Showing {filtered.length} of {checks.length} checks
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmVariant={confirmState.variant}
      />

      <TechnicalCheckModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => { fetchChecks(); fetchExpiringSoon(); setShowForm(false); }}
        initialData={editCheck}
        vehicles={vehicles}
      />
    </PageLayout>
  );
}

export default TechnicalChecks;