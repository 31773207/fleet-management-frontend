// components/common/TechnicalCheckModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { FormInput } from './FormInput';
import { SaveButton, CancelButton } from './Button';

const EMPTY_FORM = {
  vehicleId: '',
  checkDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  status: 'VALID',
  center: '',
  notes: '',
};

export function TechnicalCheckModal({ isOpen, onClose, onSuccess, initialData, vehicles }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        vehicleId:  initialData.vehicle?.id   || '',
        checkDate:  initialData.checkDate     || new Date().toISOString().split('T')[0],
        expiryDate: initialData.expiryDate    || '',
        status:     initialData.status        || 'VALID',
        center:     initialData.center        || '',
        notes:      initialData.notes         || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData, isOpen]);

  const vehicleOptions = [
    { value: '', label: 'Select Vehicle' },
    ...vehicles.map(v => ({ value: v.id, label: `${v.plateNumber} - ${v.model}` }))
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url    = initialData?.id ? `/api/technical-checks/${initialData.id}` : '/api/technical-checks';
      const method = initialData?.id ? 'PUT' : 'POST';

      const payload = {
        vehicle:    { id: parseInt(form.vehicleId) },
        checkDate:  form.checkDate,
        expiryDate: form.expiryDate,
        status:     form.status,
        center:     form.center,
        notes:      form.notes,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error saving technical check');

      onSuccess?.();
      onClose();
    } catch (error) {
      alert('Error saving technical check!');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Technical Check' : 'Add Technical Check'} size="md">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <FormInput
            label="Vehicle"
            value={form.vehicleId}
            onChange={(v) => setForm({ ...form, vehicleId: v })}
            required
            options={vehicleOptions}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FormInput
              label="Check Date"
              type="date"
              value={form.checkDate}
              onChange={(v) => setForm({ ...form, checkDate: v })}
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <FormInput
              label="Expiry Date"
              type="date"
              value={form.expiryDate}
              onChange={(v) => setForm({ ...form, expiryDate: v })}
              min={form.checkDate}
              required
            />
          </div>

          <FormInput
            label="Inspection Center"
            type="text"
            value={form.center}
            onChange={(v) => setForm({ ...form, center: v })}
            placeholder="e.g. Centre de contrôle Alger"
          />

          <FormInput
            label="Result"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v })}
            options={[
              { value: 'VALID',  label: 'PASS — Valid' },
              { value: 'FAILED', label: 'FAIL — Failed' },
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '10px', fontWeight: '700', color: '#FFD700' }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              style={{
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                fontSize: '14px',
                color: 'white',
                background: 'rgba(255,255,255,0.06)',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <CancelButton onClick={onClose}>Cancel</CancelButton>
            <SaveButton type="submit">Save</SaveButton>
          </div>

        </div>
      </form>
    </Modal>
  );
}