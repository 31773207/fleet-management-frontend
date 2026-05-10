import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FormInput } from './FormInput';
import { SaveButton, CancelButton } from './Button';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { Line } from './Line';

export function VehicleFormModal({ isOpen, onClose, onSave, initialData, fuelOptions, typeOptions }) {
  const [form, setForm] = useState({
    plateNumber: '',
    model: '',
    color: '',
    year: new Date().getFullYear().toString(),
    kilometrage: '',
    fuelType: '',
    brandName: '',
    vehicleTypeId: '',
    technicalCheckExpiry: ''   // ← NEW
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        plateNumber:           initialData.plateNumber          || '',
        model:                 initialData.model                || '',
        color:                 initialData.color                || '',
        year:                  initialData.year                 || '',
        kilometrage:           initialData.kilometrage          || '',
        fuelType:              initialData.fuelType             || '',
        brandName:             initialData.brand?.brandName     || '',
        vehicleTypeId:         initialData.vehicleType?.id      || '',
        technicalCheckExpiry:  initialData.technicalCheckExpiry || ''  // ← NEW
      });
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setForm({
      plateNumber: '',
      model: '',
      color: '',
      year: new Date().getFullYear().toString(),
      kilometrage: '',
      fuelType: '',
      brandName: '',
      vehicleTypeId: '',
      technicalCheckExpiry: ''   // ← NEW
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
      <Line />
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <FormInput label="Plate Number"  value={form.plateNumber}   onChange={(v) => setForm({ ...form, plateNumber: v })}   required />
          <FormInput label="Brand"         value={form.brandName}     onChange={(v) => setForm({ ...form, brandName: v })}     required />
          <FormInput label="Model"         value={form.model}         onChange={(v) => setForm({ ...form, model: v })}         required />
          <FormInput label="Color"         value={form.color}         onChange={(v) => setForm({ ...form, color: v })} />
          <FormInput label="Year"          type="number" value={form.year}        onChange={(v) => setForm({ ...form, year: v })}        required />
          <FormInput label="Kilometrage"   type="number" value={form.kilometrage} onChange={(v) => setForm({ ...form, kilometrage: v })} />
          <FormInput label="Fuel Type"     value={form.fuelType}      onChange={(v) => setForm({ ...form, fuelType: v })}      required options={fuelOptions} />
          <FormInput label="Vehicle Type"  value={form.vehicleTypeId} onChange={(v) => setForm({ ...form, vehicleTypeId: v })} required options={typeOptions} />

          {/* ── NEW: CT expiry date — full width ── */}
          <div style={{ gridColumn: '1 / -1' }}>
            <FormInput
              label="Technical Check Expiry Date (CT Paper)"
              type="date"
              value={form.technicalCheckExpiry}
              onChange={(v) => setForm({ ...form, technicalCheckExpiry: v })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '13px', marginTop: '40px', justifyContent: 'flex-end' }}>
          <CancelButton onClick={onClose}>Cancel</CancelButton>
          <SaveButton type="submit">Save</SaveButton>
        </div>
      </form>
    </Modal>
  );
}