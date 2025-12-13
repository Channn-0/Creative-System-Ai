
import React from 'react';
import { Select } from '../Select';
import { LightingStyle, CameraPerspective, ColorTheory } from '../../types';

interface StudioPanelProps {
  lighting: LightingStyle;
  setLighting: (val: LightingStyle) => void;
  perspective: CameraPerspective;
  setPerspective: (val: CameraPerspective) => void;
  colorTheory: ColorTheory;
  setColorTheory: (val: ColorTheory) => void;
  onShowHelper: (helperKey: string) => void;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({
  lighting, setLighting,
  perspective, setPerspective,
  colorTheory, setColorTheory,
  onShowHelper
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Lighting"
          options={Object.values(LightingStyle).map(v => ({value:v, label:v}))}
          value={lighting}
          onChange={(e) => setLighting(e.target.value as LightingStyle)}
          onHelp={() => onShowHelper('LIGHTING')}
        />
        <Select
          label="Camera Angle"
          options={Object.values(CameraPerspective).map(v => ({value:v, label:v}))}
          value={perspective}
          onChange={(e) => setPerspective(e.target.value as CameraPerspective)}
          onHelp={() => onShowHelper('ANGLE')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Color Theory"
          options={Object.values(ColorTheory).map(v => ({value:v, label:v}))}
          value={colorTheory}
          onChange={(e) => setColorTheory(e.target.value as ColorTheory)}
          onHelp={() => onShowHelper('COLOR_THEORY')}
        />
      </div>
    </>
  );
};
