/** Barre de contrôle partagée (type d'investissement + géographie), au-dessus des onglets. */
const GEO_PRESETS = ["Kenya", "Nigeria", "Maroc", "Côte d'Ivoire", "Sénégal", "Arménie", "Jordanie"];

export function ControlBar({ subtypes, sub, geo, onSub, onGeo }: {
  subtypes: string[]; sub: string; geo: string; onSub: (s: string) => void; onGeo: (g: string) => void;
}) {
  return (
    <div className="controls">
      <div className="ctl">
        <label>Type d&apos;investissement</label>
        <div className="seg">
          {subtypes.map((s) => (
            <button key={s} className={s === sub ? "on" : ""} onClick={() => onSub(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="ctl">
        <label>Géographie du projet</label>
        <div className="geo-in">
          <input value={geo} placeholder="ex. Kenya" onChange={(e) => onGeo(e.target.value)} />
          <div className="chips">
            {GEO_PRESETS.map((g) => <span key={g} className="chip" onClick={() => onGeo(g)}>{g}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
