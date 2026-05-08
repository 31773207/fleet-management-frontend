import React from 'react';

const PERIODS = [
  { value: 'day',   label: 'Day'   },
  { value: 'week',  label: 'Week'  },
  { value: 'month', label: 'Month' },
  { value: 'year',  label: 'Year'  },
];

function SegmentedPeriod({ value, onChange }) {
  return (
    <div className="seg">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          className={`seg-btn${value === p.value ? ' active' : ''}`}
          onClick={() => onChange(p.value)}
          type="button"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedPeriod;