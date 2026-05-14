import React, { useState, useEffect } from "react";
import PageLayout from "../../components/layout/PageLayout";
import useGasCoupons from "../../hooks/useGasCoupons";
import { filterCoupons, getCouponStats, getStatusLabel } from "../../utils/gas-coupons.utils";
import { AddButton, DeleteButton, AssignButton, TransferButton } from "../../components/common/Button";
import Button from "../../components/common/Button";
import { FilterBar } from "../../components/common/FilterBar";
import { DataTable } from "../../components/common/DataTable";
import { Badge } from "../../components/common/Badge";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../contexts/ToastContext";
import { canEdit } from "../../utils/roles";
import { GasCouponModal } from "../../components/common/GasCouponModal";
import { AssignCouponModal } from "../../components/common/AssignCouponModal";
import { TransferCouponModal } from "../../components/common/TransferCouponModal";

function GasCoupons() {
  const { addToast } = useToast();
  const { confirmState, showConfirm, hideConfirm } = useConfirm();
  
  const {
    coupons,
    loading,
    availableQuantity,
    fetchCoupons,
    fetchAvailableQuantity,
    deleteBatch
  } = useGasCoupons();

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCoupons();
    fetchAvailableQuantity();
  }, [fetchCoupons, fetchAvailableQuantity]);

  const handleDelete = (id, batchNumber) => {
    showConfirm(
      'Delete Batch',
      `Delete batch "${batchNumber}"?`,
      async () => {
        await deleteBatch(id);
        fetchCoupons();
        fetchAvailableQuantity();
      },
      'danger'
    );
  };

  const filteredCoupons = filterCoupons(coupons, search, filter);
  const stats = getCouponStats(coupons);

  const columns = [
    { key: "id", label: "ID", width: "60px" },
    { key: "batchNumber", label: "Batch Number", render: (v) => v || "—"},
    { key: "quantityBought", label: "quantity Bought", render: (v) => v || 0 },
    { key: "quantityRemaining", label: "Remaining", render: (v) => v || 0 },
    { key: "buyDate", label: "Buy Date", render: (v) => v || "—" },
    { key: "expiryDate", label: "Expiry Date", render: (v) => v || "—" },
    { key: "status", label: "Status", render: (v) => <Badge status={v} label={getStatusLabel(v)} /> },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => !canEdit() ? <span style={{ color: '#888' }}>—</span> : (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {row.status === "AVAILABLE" && row.quantityRemaining > 0 && (
            <>
              <AssignButton onClick={() => { setSelectedBatch(row); setShowAssignModal(true); }} />
              <TransferButton onClick={() => { setSelectedBatch(row); setShowTransferModal(true); }} />
            </>
          )}
          <DeleteButton onClick={() => handleDelete(row.id, row.batchNumber)} />
        </div>
      )
    }
  ];

  // Calculate used coupons
  const totalUsed = stats.totalBought - stats.totalRemaining;

  return (
    <PageLayout>
      <div className="content-header">
        <h2 className="page-title">Gas Coupons</h2>
        {canEdit() && (
          <AddButton onClick={() => setShowBuyModal(true)}>Add Coupons</AddButton>
        )}
      </div>

      {/* Summary Cards - Removed "Remaining" card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20,  fontSize: 20 }}>
        <SummaryCard icon="fa-database" color="#001345" label="Total Bought" value={stats.totalBought} />
        <SummaryCard icon="fa-ticket-alt" color="#28a745" label="Available" value={availableQuantity} />
        <SummaryCard icon="fa-check-circle" color="#17a2b8" label="Used" value={totalUsed} />
      </div>

      {/* Removed search input - only filter tabs */}
      <FilterBar
        filters={["All", "AVAILABLE", "DEPLETED", "EXPIRED"]}
        activeFilter={filter}
        onFilterChange={setFilter}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by batch number..."
        showSearch={false}  // Hide search input
      />

      {loading ? <LoadingSpinner /> : (
        <DataTable columns={columns} data={filteredCoupons} emptyMessage="No coupons found" />
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmVariant={confirmState.variant}
      />

      <GasCouponModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={() => {
          fetchCoupons();
          fetchAvailableQuantity();
          setShowBuyModal(false);
        }}
      />

      <AssignCouponModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={() => {
          fetchCoupons();
          fetchAvailableQuantity();
          setShowAssignModal(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
      />

      <TransferCouponModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={() => {
          fetchCoupons();
          fetchAvailableQuantity();
          setShowTransferModal(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
      />
    </PageLayout>
  );
}

function SummaryCard({ icon, color, label, value }) {
  return (
    <div style={{
      background: "rgba(42, 60, 98, 0.61)", borderRadius: 10,
      padding: "14px 16px",
      borderLeft: `4px solid ${color}`,
      backdropFilter: "blur(8px)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 18, color: "rgba(255,255,255,0.5)" }}>{label}</span>
        <i className={`fas ${icon}`} style={{ color, fontSize: 20 }}></i>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

export default GasCoupons;