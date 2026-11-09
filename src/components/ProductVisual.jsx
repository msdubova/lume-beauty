export default function ProductVisual({ shape, tone }) {
  return (
    <div className={`product-art art-${shape} tone-${tone}`} aria-hidden="true">
      <div className="art-shadow" />
      <div className="product-object">
        {shape === 'jar' && <><span className="jar-lid" /><span className="jar-body"><i>LUME<br />FORMULA</i></span></>}
        {shape === 'dropper' && <><span className="dropper-cap" /><span className="dropper-neck" /><span className="dropper-body"><i>DAILY<br />SERUM</i></span></>}
        {shape === 'compact' && <><span className="compact-lid"><i>V</i></span><span className="compact-base" /></>}
        {shape === 'bottle' && <><span className="bottle-cap" /><span className="bottle-neck" /><span className="bottle-body"><i>ATELIER<br />NO. 8</i></span></>}
        {shape === 'perfume' && <><span className="perfume-cap" /><span className="perfume-neck" /><span className="perfume-body"><i>MAISON<br />AUBE</i></span></>}
        {shape === 'spray' && <><span className="spray-cap" /><span className="spray-neck" /><span className="spray-body"><i>FACE<br />MIST</i></span></>}
        {shape === 'tube' && <><span className="tube-cap" /><span className="tube-body"><i>VELVET<br />LIP</i></span></>}
      </div>
    </div>
  )
}
