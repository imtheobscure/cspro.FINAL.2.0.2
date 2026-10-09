import React from 'react';
import { groupVoicesForSelect } from '../../utils/voiceGroups';

interface Props {
  voices: SpeechSynthesisVoice[];
  /** Which voice property to use as the <option> value. Defaults to voiceURI. */
  valueKey?: 'uri' | 'name';
}

/**
 * Renders <optgroup>/<option> elements for a native <select>:
 * natural voices grouped by accent + gender at the TOP (British first, red),
 * followed by every remaining voice under "Other Voices".
 *
 * Usage: <select ...>{<GroupedVoiceOptions voices={voices} />}</select>
 */
export const GroupedVoiceOptions: React.FC<Props> = ({ voices, valueKey = 'uri' }) => {
  const groups = groupVoicesForSelect(voices || []);
  return (
    <>
      {groups.map(g => (
        <optgroup
          key={g.key}
          label={`${g.flag} ${g.label}`}
          style={{ color: g.isBritish ? '#dc2626' : undefined, fontWeight: 700 }}
        >
          {g.options.map(o => (
            <option
              key={o.value}
              value={valueKey === 'name' ? (o.voice?.name || o.value) : o.value}
              style={o.isBritish ? { color: '#dc2626', fontWeight: 600 } : undefined}
            >
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
};

export default GroupedVoiceOptions;