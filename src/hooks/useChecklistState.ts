import { useLocalStorage } from './useLocalStorage';

export interface ChecklistState {
  instrument: string;
  datetime: string;
  closingTime: string;
  session: string;

  hasRedFolder: boolean;
  rfOther: string;
  event30Min: boolean;

  // Checkboxes block A
  a1: boolean; a1_dir: string;
  a2: boolean; a3: boolean;

  // Checkboxes block B
  b1: boolean; b2: boolean; b_delivery: string;

  // Checkboxes block C
  c1: boolean; c1_dir: string;
  c2: boolean; c2_pool: string;

  // Checkboxes block D
  d1: boolean; d2: boolean; d3: boolean;

  // Checkboxes block E
  e1: boolean; e2: boolean; e3: boolean;

  // Multipliers (Arrays of indices or ids)
  rfFlags: string[];
  triggerFlags: string[];

  notes: string;
}

export const defaultState: ChecklistState = {
  instrument: '',
  datetime: '',
  closingTime: '',
  session: 'NY AM',

  hasRedFolder: false,
  rfOther: '',
  event30Min: false,

  a1: false, a1_dir: '',
  a2: false, a3: false,

  b1: false, b2: false, b_delivery: 'balanced',

  c1: false, c1_dir: '',
  c2: false, c2_pool: '',

  d1: false, d2: false, d3: false,

  e1: false, e2: false, e3: false,

  rfFlags: [],
  triggerFlags: [],

  notes: '',
};

export function useChecklistState() {
  const [state, setState] = useLocalStorage<ChecklistState>('ict_state_v2', defaultState);

  const updateField = (field: keyof ChecklistState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRfFlag = (val: string) => {
    setState((prev) => {
      const exists = prev.rfFlags.includes(val);
      return { ...prev, rfFlags: exists ? prev.rfFlags.filter(f => f !== val) : [...prev.rfFlags, val] };
    });
  };

  const toggleTriggerFlag = (val: string) => {
    setState((prev) => {
      const exists = prev.triggerFlags.includes(val);
      return { ...prev, triggerFlags: exists ? prev.triggerFlags.filter(f => f !== val) : [...prev.triggerFlags, val] };
    });
  };

  const resetState = () => {
    // We clear localStorage explicitly and set defaultState
    window.localStorage.removeItem('ict_state_v2'); // We can use v2 to avoid conflicts
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setState({ ...defaultState, datetime: now.toISOString().slice(0, 16) });
  };

  return {
    state,
    updateField,
    toggleRfFlag,
    toggleTriggerFlag,
    resetState,
    setState
  };
}
