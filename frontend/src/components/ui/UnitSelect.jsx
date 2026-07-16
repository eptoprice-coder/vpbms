'use client';
import { useState } from 'react';

// Common Indian market units — weight, volume, count and packaging.
export const UNITS = [
  'kg', '100 g', '250 g', '500 g', 'g', 'quintal', 'ton',
  'litre', '500 ml', 'ml',
  'piece', 'dozen', 'pair',
  'bundle', 'bunch',
  'box', 'crate', 'tray', 'bag', 'sack', 'packet', 'roll', 'basket',
];

// Dropdown of standard units with an "Other…" escape hatch for custom units.
export default function UnitSelect({ value, onChange, className = '' }) {
  const isCustom = value !== '' && !UNITS.includes(value);
  const [custom, setCustom] = useState(isCustom);

  if (custom) {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <input
          className="input-field flex-1"
          value={value}
          autoFocus
          placeholder="Type unit, e.g. barrel"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary px-2 text-xs"
          title="Back to standard units"
          onClick={() => { setCustom(false); onChange('kg'); }}
        >
          List
        </button>
      </div>
    );
  }

  return (
    <select
      className={`input-field ${className}`}
      value={UNITS.includes(value) ? value : 'kg'}
      onChange={(e) => {
        if (e.target.value === '__other__') { setCustom(true); onChange(''); }
        else onChange(e.target.value);
      }}
    >
      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      <option value="__other__">Other…</option>
    </select>
  );
}
