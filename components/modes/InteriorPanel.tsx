
import React from 'react';
import { Select } from '../Select';
import { InteriorStyle, InteriorMaterial } from '../../types';

interface InteriorPanelProps {
  style: InteriorStyle;
  setStyle: (val: InteriorStyle) => void;
  material: InteriorMaterial;
  setMaterial: (val: InteriorMaterial) => void;
  onShowHelper: (helperKey: string) => void;
}

export const InteriorPanel: React.FC<InteriorPanelProps> = ({
  style, setStyle,
  material, setMaterial,
  onShowHelper
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Select
        label="Design Style"
        options={Object.values(InteriorStyle).map(v => ({value:v, label:v}))}
        value={style}
        onChange={(e) => setStyle(e.target.value as InteriorStyle)}
        onHelp={() => onShowHelper('INTERIOR_STYLE')}
      />
      <Select
        label="Materials"
        options={Object.values(InteriorMaterial).map(v => ({value:v, label:v}))}
        value={material}
        onChange={(e) => setMaterial(e.target.value as InteriorMaterial)}
        onHelp={() => onShowHelper('INTERIOR_MATERIAL')}
      />
    </div>
  );
};
