import { useRef, useState } from 'react';
import { exportJson, importJson, reset, update, useData } from '../core/store';

export function Settings() {
  const data = useData();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mathdeck-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="settings">
      <h2>Settings</h2>
      <NumberSetting
        label="Problems per study session"
        note="you can always keep going"
        value={data.settings.sessionLength}
        min={3}
        max={50}
        onChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, sessionLength: v } }))}
      />
      <NumberSetting
        label="Most problems per review"
        note="the most overdue and weakest come first"
        value={data.settings.reviewCap}
        min={5}
        max={200}
        onChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, reviewCap: v } }))}
      />

      <h3>Your data</h3>
      <p className="muted small">
        Progress lives in this browser's local storage. Export a backup now and then, or to move to another machine.
        {` ${Object.keys(data.states).length} sections started, ${data.log.length} answers logged.`}
      </p>
      <div className="actions left">
        <button className="ghost" onClick={download}>
          Export backup
        </button>
        <button className="ghost" onClick={() => file.current?.click()}>
          Import backup
        </button>
        <button className="ghost danger" onClick={() => confirm('Erase all progress? Export a backup first if unsure.') && reset()}>
          Reset everything
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              importJson(await f.text());
              setMsg('Imported.');
            } catch (err) {
              setMsg(`Import failed: ${(err as Error).message}`);
            }
            e.target.value = '';
          }}
        />
      </div>
      {msg && <p className="small">{msg}</p>}

      <h3>Typing answers</h3>
      <table className="syntax">
        <tbody>
          {[
            ['x^2, x^(1/3)', 'powers'],
            ['2x, 3xe^x, x(x+1)', 'implicit multiplication works'],
            ['sqrt(x), ln(x) or ln|x|, e^x or exp(x)', 'functions'],
            ['sin(x)^2', 'powers of trig (not sin^2 x)'],
            ['arctan(x), asin(x)', 'inverse trig'],
            ['3/8, -1/2, pi/4, sqrt(2)/2', 'exact numbers'],
            ['inf', '∞'],
            ['+ C', 'optional on antiderivatives'],
          ].map(([a, b]) => (
            <tr key={a}>
              <td>
                <code>{a}</code>
              </td>
              <td className="muted">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Any equivalent form is accepted: answers are compared numerically at several points.</p>
    </div>
  );
}

function NumberSetting(props: { label: string; note: string; value: number; min: number; max: number; onChange(v: number): void }) {
  return (
    <label className="setting">
      <span>
        {props.label}
        <span className="muted small"> · {props.note}</span>
      </span>
      <input
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => props.onChange(Math.max(props.min, Math.min(props.max, Number(e.target.value) || props.min)))}
      />
    </label>
  );
}
