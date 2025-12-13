
import React from 'react';
import { Select } from '../Select';
import { PortraitEnvironment, PortraitVibe } from '../../types';

interface PortraitPanelProps {
  env: PortraitEnvironment;
  setEnv: (val: PortraitEnvironment) => void;
  vibe: PortraitVibe;
  setVibe: (val: PortraitVibe) => void;
  onShowHelper: (helperKey: string) => void;
}

export const PortraitPanel: React.FC<PortraitPanelProps> = ({
  env, setEnv,
  vibe, setVibe,
  onShowHelper
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Select
        label="Environment"
        options={Object.values(PortraitEnvironment).map(v => ({value:v, label:v}))}
        value={env}
        onChange={(e) => setEnv(e.target.value as PortraitEnvironment)}
        onHelp={() => onShowHelper('PORTRAIT_ENV')}
      />
      <Select
        label="Vibe & Lighting"
        options={Object.values(PortraitVibe).map(v => ({value:v, label:v}))}
        value={vibe}
        onChange={(e) => setVibe(e.target.value as PortraitVibe)}
        onHelp={() => onShowHelper('PORTRAIT_VIBE')}
      />
    </div>
  );
};
