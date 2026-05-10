import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/layout/PageLayout';
import { useToast } from '../../contexts/ToastContext';
import { FilterBar } from '../../components/common/FilterBar';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { useVehicles } from '../../hooks/useVehicles';
import { MaintenanceModal } from '../../components/common/MaintenanceModal';
import { VehicleFormModal } from '../../components/common/VehicleFormModal';
import { filterVehicles, getFuelOptions, getTypeOptions } from '../../utils/vehicles.utils';
import './Vehicles.css';
import { canEdit } from "../../utils/roles";
import { useConfirm } from '../../hooks/useConfirm';
import { 
  AddButton, 
  EditButton, 
  DeleteButton,
  MaintButton,
  BreakButton,
  ReformButton,
  AvailableButton
} from '../../components/common/Button';

function Vehicles() {
  const { addToast } = useToast();
  const {
    vehicles,
    brands,
    types,
    loading,
    fetchVehicles,
    fetchBrands,
    fetchTypes,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    ensureBrand,
    changeStatus
  } = useVehicles();

  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  const { confirmState, showConfirm, hideConfirm } = useConfirm();

  useEffect(() => {
    fetchVehicles();
    fetchBrands();
    fetchTypes();
  }, []);

  const resetForm = () => {
    setEditVehicle(null);
  };

  const handleEdit = (v) => {
    setEditVehicle(v);
    setShowForm(true);
  };

  const handleDelete = (id, plateNumber) => {
    showConfirm(
      'Delete Vehicle',
      `Delete vehicle "${plateNumber}"?`,
      async () => {
        await deleteVehicle(id);
        await fetchVehicles();
        addToast(` Vehicle ${plateNumber} deleted`, 'success');
      },
      'danger'
    );
  };

  const handleMaint = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowMaintModal(true);
  };

  const handleBreak = (id, plateNumber) => {
    showConfirm(
      'Report Breakdown',
      `Report vehicle "${plateNumber}" as broken down?`,
      async () => {
        await changeStatus(id, 'breakdown');
        addToast(`  Vehicle ${plateNumber} reported as broken`, 'warning');
      },
      'warning'
    );
  };

  const handleAvail = (id, plateNumber) => {
    showConfirm(
      'Mark Available',
      `Mark vehicle "${plateNumber}" as available?`,
      async () => {
        await changeStatus(id, 'available');
        addToast(` Vehicle ${plateNumber} is now available`, 'success');
      },
      'success'
    );
  };

  const handleReform = (id, plateNumber) => {
    showConfirm(
      'Reform Vehicle',
      `Reform vehicle "${plateNumber}"? This cannot be undone.`,
      async () => {
        await changeStatus(id, 'reform');
        addToast(` Vehicle ${plateNumber} marked as reformed`, 'info');
      },
      'danger'
    );
  };

  const filtered = filterVehicles(vehicles, search, filter);
  const fuelOptions = getFuelOptions();
  const typeOptions = getTypeOptions(types);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'plateNumber', label: 'Plate Number', render: (value) => <strong>{value}</strong> },
    { key: 'brand', label: 'Brand', render: (value) => value?.brandName || '—' },
    { key: 'model', label: 'Model' },
    { key: 'color', label: 'Color', render: (value) => value || '—' },
    { key: 'year', label: 'Year' },
    { key: 'fuelType', label: 'Fuel' },
    { key: 'vehicleType', label: 'Type', render: (value) => value?.typeName || '—' },
    { key: 'status', label: 'Status', render: (value) => <Badge status={value} /> },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, row) => !canEdit() ? <span style={{color:'#888'}}>—</span> : (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <EditButton onClick={() => handleEdit(row)} title="Edit Vehicle" />
          
          {(row.status === 'AVAILABLE' || row.status === 'REFORMED') && (
            <>
              <MaintButton onClick={() => handleMaint(row)} />
              <BreakButton onClick={() => handleBreak(row.id, row.plateNumber)} />
              {row.status === 'AVAILABLE' && (
                <ReformButton onClick={() => handleReform(row.id, row.plateNumber)} />
              )}
            </>
          )}
          
          {(row.status === 'IN_REVISION' || row.status === 'BREAKDOWN' || row.status === 'REFORMED') && (
            <AvailableButton onClick={() => handleAvail(row.id, row.plateNumber)} />
          )}
          
          <DeleteButton 
            onClick={() => handleDelete(row.id, row.plateNumber)} 
            itemName={`vehicle ${row.plateNumber}`}
            title="Delete Vehicle"
          />
        </div>
      )
    }
  ];

  return (
    <PageLayout>
      <div className='content-header'>
        <h2>Vehicles</h2>
        {canEdit() && (
          <AddButton onClick={() => { resetForm(); setEditVehicle(null); setShowForm(true); }}>
            + Add Vehicle
          </AddButton>
        )}
      </div>

      <div className='content-body'>
        <FilterBar
          filters={['All', 'AVAILABLE', 'ASSIGNED', 'IN_MISSION', 'IN_REVISION', 'BREAKDOWN', 'REFORMED']}
          activeFilter={filter}
          onFilterChange={setFilter}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder=' Search by plate, model or brand...'
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <DataTable 
          columns={columns} 
          data={filtered}
          emptyMessage="No vehicles found"
        />
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmVariant={confirmState.variant}
      />

      <VehicleFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditVehicle(null); }}
        onSave={async (formData) => {
          const brandId = await ensureBrand(formData.brandName);
          const vehicleData = {
            plateNumber:          formData.plateNumber,
            model:                formData.model,
            color:                formData.color,
            year:                 parseInt(formData.year),
            kilometrage:          parseFloat(formData.kilometrage) || 0,
            fuelType:             formData.fuelType,
            brand:                brandId ? { id: parseInt(brandId) } : null,
            vehicleType:          formData.vehicleTypeId ? { id: parseInt(formData.vehicleTypeId) } : null,
            technicalCheckExpiry: formData.technicalCheckExpiry || null,  // ← NEW
          };

          if (editVehicle) {
            await updateVehicle(editVehicle.id, vehicleData);
            addToast(' Vehicle updated', 'success');
          } else {
            await createVehicle(vehicleData);
            addToast(' Vehicle created', 'success');
          }
          setShowForm(false);
          setEditVehicle(null);
          fetchVehicles();
        }}
        initialData={editVehicle}
        fuelOptions={fuelOptions}
        typeOptions={typeOptions}
      />

      <MaintenanceModal
        isOpen={showMaintModal}
        onClose={() => { setShowMaintModal(false); setSelectedVehicle(null); }}
        onSuccess={() => {
          fetchVehicles();
          addToast(' Vehicle sent to maintenance', 'success');
          setShowMaintModal(false);
          setSelectedVehicle(null);
        }}
        vehicle={selectedVehicle}
        vehicles={[]}
      />
    </PageLayout>
  );
}

export default Vehicles;