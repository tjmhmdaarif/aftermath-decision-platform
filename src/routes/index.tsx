import { Component, lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowDownRight, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Compass, RotateCcw, Save, SlidersHorizontal, Sparkles, Utensils, Waves, Zap } from 'lucide-react'

const CampusScene = lazy(() => import('@/components/CampusScene'))
const subscribeClient = () => () => {}
const getClientReady = () => true
const getServerReady = () => false
const DEFAULT_INPUTS = { plannedMeals: 470, expectedDemand: 450, portionGrams: 200, ingredientCost: 2.6 }
const BASELINE = { ...DEFAULT_INPUTS, plannedMeals: 500 }
const MODEL = { id: 'campus-food', version: '0.1.0-demo', waterPerMeal: 4.6, energyPerMeal: 0.18 }
type Inputs = typeof DEFAULT_INPUTS
type Metrics = { surplusMeals: number; surplusMass: number; ingredientSpend: number; water: number; energy: number; unmetMeals: number }

function calculate(inputs: Inputs): Metrics {
  const surplusMeals = Math.max(0, inputs.plannedMeals - inputs.expectedDemand)
  return {
    surplusMeals,
    surplusMass: surplusMeals * inputs.portionGrams / 1000,
    ingredientSpend: inputs.plannedMeals * inputs.ingredientCost,
    water: inputs.plannedMeals * MODEL.waterPerMeal,
    energy: inputs.plannedMeals * MODEL.energyPerMeal,
    unmetMeals: Math.max(0, inputs.expectedDemand - inputs.plannedMeals),
  }
}

function round(value: number, places = 1) { return Number(value.toFixed(places)) }
function hashInputs(inputs: Inputs) {
  const source = JSON.stringify({ ...inputs, modelVersion: MODEL.version })
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619)
  return `demo-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) }

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function RangeControl({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-3">
      <span className="flex items-center justify-between gap-3 text-sm text-foreground">
        <span>{label}</span><span className="font-mono text-xs text-primary">{value.toLocaleString()} {unit}</span>
      </span>
      <input className="w-full accent-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={`${label}, ${value} ${unit}`} />
      <span className="flex justify-between font-mono text-[10px] text-muted-foreground"><span>{min} {unit}</span><span>{max} {unit}</span></span>
    </label>
  )
}

function CampusFallback({ surplus }: { surplus: number }) {
  return (
    <div className="campus-grid-ink relative flex h-full min-h-[290px] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_40%,oklch(0.29_0.025_70),oklch(0.18_0.008_70)_70%)]" role="img" aria-label={`Illustrated campus scene: dining hall, residence, garden and ${surplus} estimated surplus meals`}>
      <div className="relative grid h-52 w-[min(88%,480px)] grid-cols-3 items-end gap-4 [perspective:700px]">
        <div className="relative h-28 -skew-y-6 rounded-md border border-primary/20 bg-gradient-to-br from-secondary to-card shadow-2xl"><span className="absolute -top-5 left-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Commons</span><div className="absolute inset-x-3 bottom-3 flex h-10 items-center justify-center rounded-sm bg-primary/15 text-primary"><Utensils size={18} /></div></div>
        <div className="relative h-40 -skew-y-6 rounded-md border border-primary/25 bg-gradient-to-br from-primary/30 via-secondary to-card shadow-2xl"><span className="absolute -top-5 left-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Dining hall</span><div className="absolute inset-x-3 bottom-3 grid grid-cols-4 gap-1">{Array.from({ length: 8 }, (_, index) => <div key={index} className={`h-4 rounded-sm ${index < Math.min(8, Math.ceil(surplus / 7)) ? 'bg-primary/75' : 'bg-muted/70'}`} />)}</div></div>
        <div className="relative h-24 -skew-y-6 rounded-md border border-emerald-900/40 bg-gradient-to-br from-emerald-900/50 to-card shadow-2xl"><span className="absolute -top-5 left-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Garden</span><div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 text-emerald-200/75"><Waves size={16} /><span className="text-[9px]">resource loop</span></div></div>
      </div>
      <div className="absolute bottom-4 left-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> 2D campus view</div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'AFTERMATH · Campus decision lab' }, { name: 'description', content: 'Explore how campus meal planning affects surplus, cost, water, and kitchen energy.' }] }),
  component: CampusWorkspace,
})

function CampusWorkspace() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS)
  const [lastRun, setLastRun] = useState<Inputs>(DEFAULT_INPUTS)
  const sceneReady = useSyncExternalStore(subscribeClient, getClientReady, getServerReady)
  const [show3d, setShow3d] = useState(true)
  const [showMethod, setShowMethod] = useState(false)
  const [status, setStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const baselineMetrics = useMemo(() => calculate(BASELINE), [])
  const metrics = useMemo(() => calculate(lastRun), [lastRun])
  const hasChanges = JSON.stringify(inputs) !== JSON.stringify(lastRun)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
    try {
      const local = localStorage.getItem('aftermath-campus-demo-v1')
      if (local) {
        const parsed = JSON.parse(local) as Partial<Inputs>
        if ([parsed.plannedMeals, parsed.expectedDemand, parsed.portionGrams, parsed.ingredientCost].every((value) => typeof value === 'number' && Number.isFinite(value))) {
          const restored = { ...DEFAULT_INPUTS, ...parsed }
          setInputs(restored)
          setLastRun(restored)
          setSaved(true)
        }
      }
    } catch { setStatus('A local example could not be restored; using the sample scenario.') }
    })
    return () => { cancelled = true }
  }, [])

  const update = (key: keyof Inputs, value: number) => setInputs((current) => ({ ...current, [key]: value }))
  const runSimulation = () => {
    setLastRun({ ...inputs })
    setStatus(`Campus estimate recalculated. Input fingerprint ${hashInputs(inputs)}.`)
  }
  const saveLocal = () => {
    try {
      localStorage.setItem('aftermath-campus-demo-v1', JSON.stringify(inputs))
      setLastRun({ ...inputs })
      setSaved(true)
      setStatus('Saved on this device only. This anonymous demo is not synced to an account or server.')
    } catch { setStatus('This browser could not save the example. Your current estimate is still available on this page.') }
  }
  const reset = () => { setInputs(DEFAULT_INPUTS); setLastRun(DEFAULT_INPUTS); setStatus('Restored the example scenario.') }

  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <a href="#workspace" className="flex min-h-11 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="AFTERMATH decision lab home">
            <span className="grid h-9 w-9 place-items-center border border-primary/40 text-primary"><Compass size={18} strokeWidth={1.5} /></span>
            <span><span className="block text-sm font-semibold tracking-[0.18em]">AFTERMATH</span><span className="hidden text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Decision lab · demo</span></span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-xs text-muted-foreground md:flex">
            <a href="#workspace" className="border-b border-primary py-2 text-foreground">Simulation</a>
            <button onClick={() => setShowMethod((open) => !open)} className="py-2 transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Method notes</button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[10px] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> ANONYMOUS DEMO</span>
            <button onClick={() => setShowMethod((open) => !open)} className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:hidden" aria-label="Toggle model notes"><BookOpen size={16} /></button>
            <button onClick={reset} className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" aria-label="Reset example"><RotateCcw size={16} /></button>
          </div>
        </div>
      </header>

      <main id="workspace" className="mx-auto max-w-[1600px] px-4 pb-10 pt-7 sm:px-7 sm:pt-10 lg:px-10 lg:pt-12">
        <div className="mb-8 flex flex-col justify-between gap-5 md:mb-10 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary"><span className="h-px w-7 bg-primary" /> World 01 <span className="text-muted-foreground">/</span> Campus food systems</p>
            <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-[58px]">One menu. <span className="text-primary">Many consequences.</span></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">Explore how a small production decision ripples through a campus kitchen. Change the plan; inspect what the model calculates.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 border-l border-border pl-4 text-xs text-muted-foreground sm:pl-5">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-border text-primary"><Utensils size={15} /></span>
            <span><span className="block text-foreground">North Quad Commons</span><span className="mt-1 block font-mono text-[10px]">SAMPLE SCENARIO · DAY 01</span></span>
          </div>
        </div>

        {showMethod && <section className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-5" aria-labelledby="method-title"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Model card · campus-food 0.1.0-demo</p><h2 id="method-title" className="mt-2 font-serif text-2xl">What this estimate means</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">Surplus meals = max(0, planned − expected demand). Potential surplus mass = surplus meals × portion grams ÷ 1,000. Ingredient spend = planned meals × cost per meal. Water and energy use apply fixed sample factors of 4.6 L and 0.18 kWh per planned meal. These are deterministic teaching assumptions, not measured outcomes or a validated forecast.</p></div><button onClick={() => setShowMethod(false)} className="rounded px-3 py-2 text-xs text-muted-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Close</button></div></section>}

        <div className="grid gap-4 xl:grid-cols-[minmax(245px,0.84fr)_minmax(400px,1.48fr)_minmax(270px,0.92fr)] xl:items-start">
          <section className="order-2 rounded-2xl border border-border bg-card p-5 sm:p-6 xl:order-1" aria-labelledby="controls-title">
            <div className="mb-7 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">01 · Intervention</p><h2 id="controls-title" className="mt-2 text-lg font-medium">Tune the plan</h2></div><SlidersHorizontal size={17} className="text-muted-foreground" /></div>
            <div className="space-y-7">
              <RangeControl label="Meals to prepare" value={inputs.plannedMeals} min={250} max={650} step={10} unit="meals" onChange={(value) => update('plannedMeals', value)} />
              <RangeControl label="Expected demand" value={inputs.expectedDemand} min={250} max={650} step={10} unit="meals" onChange={(value) => update('expectedDemand', value)} />
              <RangeControl label="Portion size" value={inputs.portionGrams} min={100} max={500} step={10} unit="g" onChange={(value) => update('portionGrams', value)} />
              <RangeControl label="Ingredient cost / meal" value={inputs.ingredientCost} min={1} max={8} step={0.1} unit="$" onChange={(value) => update('ingredientCost', value)} />
            </div>
            <div className="mt-7 rounded-xl border border-border/80 bg-background/65 p-3.5"><p className="flex items-center gap-2 text-xs text-foreground"><CircleHelp size={14} className="text-primary" /> Model guardrail</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">A production shortfall is shown separately from surplus. No demand forecast is inferred.</p></div>
            <button onClick={runSimulation} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Sparkles size={15} /> {hasChanges ? 'Run updated estimate' : 'Recalculate estimate'} <ArrowRight size={15} /></button>
            <button onClick={saveLocal} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-4 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><Save size={14} /> {saved ? 'Save again on this device' : 'Save on this device'}</button>
            <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">Anonymous demo · local browser storage only</p>
          </section>

          <section className="order-1 min-w-0 overflow-hidden rounded-2xl border border-border bg-card xl:order-2" aria-labelledby="scene-title">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5"><div><p className="font-mono text-[9px] uppercase tracking-[0.19em] text-muted-foreground">Live system view</p><h2 id="scene-title" className="mt-1 text-sm font-medium">North Quad · food loop</h2></div><div className="flex rounded-lg border border-border bg-background p-1" aria-label="World view"><button onClick={() => setShow3d(true)} aria-pressed={show3d} className={`min-h-8 rounded-md px-3 text-[10px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${show3d ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>3D scene</button><button onClick={() => setShow3d(false)} aria-pressed={!show3d} className={`min-h-8 rounded-md px-3 text-[10px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${!show3d ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>2D view</button></div></div>
            <div className="relative h-[320px] sm:h-[390px] xl:h-[440px]">
              {show3d && sceneReady ? <SceneBoundary fallback={<CampusFallback surplus={metrics.surplusMeals} />}><Suspense fallback={<CampusFallback surplus={metrics.surplusMeals} />}><CampusScene surplus={metrics.surplusMeals} /></Suspense></SceneBoundary> : <CampusFallback surplus={metrics.surplusMeals} />}
              {show3d && <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-foreground backdrop-blur sm:left-5 sm:top-5"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />drag to orbit</div>}
              <div className="pointer-events-none absolute bottom-4 right-4 rounded-md border border-border/70 bg-background/80 px-3 py-2 font-mono text-[9px] text-muted-foreground backdrop-blur sm:bottom-5 sm:right-5">{metrics.surplusMeals} potential surplus meals</div>
            </div>
            <div className="grid grid-cols-3 border-t border-border/70 bg-background/35">
              {[['01', 'Demand'], ['02', 'Preparation'], ['03', 'Surplus']].map(([number, label], index) => <div key={number} className={`px-3 py-3 sm:px-5 ${index > 0 ? 'border-l border-border/70' : ''}`}><p className="font-mono text-[9px] text-primary">{number} <ArrowDownRight size={10} className="inline" /></p><p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{label}</p></div>)}
            </div>
          </section>

          <section className="order-3 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="outcomes-title">
            <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">02 · Consequences</p><h2 id="outcomes-title" className="mt-2 font-serif text-[25px] leading-tight">A smaller surplus.</h2></div><span className="mt-1 rounded-full border border-primary/30 px-2 py-1 font-mono text-[9px] text-primary">ESTIMATE</span></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Intervention compared with the 500-meal baseline.</p>
            <div className="mt-5 space-y-2">
              <Outcome label="Potential surplus mass" value={`${round(metrics.surplusMass)} kg`} baseline={`${round(baselineMetrics.surplusMass)} kg`} delta={round(metrics.surplusMass - baselineMetrics.surplusMass)} unit="kg" icon={<Utensils size={15} />} />
              <Outcome label="Ingredient spend" value={money(metrics.ingredientSpend)} baseline={money(baselineMetrics.ingredientSpend)} delta={round(metrics.ingredientSpend - baselineMetrics.ingredientSpend, 0)} unit="$" icon={<ArrowDownRight size={15} />} />
              <Outcome label="Water use" value={`${round(metrics.water)} L`} baseline={`${round(baselineMetrics.water)} L`} delta={round(metrics.water - baselineMetrics.water)} unit="L" icon={<Waves size={15} />} />
              <Outcome label="Kitchen energy" value={`${round(metrics.energy)} kWh`} baseline={`${round(baselineMetrics.energy)} kWh`} delta={round(metrics.energy - baselineMetrics.energy, 1)} unit="kWh" icon={<Zap size={15} />} />
            </div>
            {metrics.unmetMeals > 0 && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs leading-5 text-foreground" role="alert">The plan is {metrics.unmetMeals} meals below expected demand. This model does not estimate the real-world effect of a shortage.</p>}
            <div className="mt-5 border-t border-border pt-4"><p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><BookOpen size={13} /> Read the result carefully</p><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Lower planned volume reduces modeled inputs. Potential surplus mass is not measured food waste; ingredient, water, and energy factors are illustrative constants.</p></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground"><span>MODEL {MODEL.version}</span><span title={hashInputs(lastRun)}>RUN {hashInputs(lastRun)}</span></div>
          </section>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 sm:flex-row sm:items-center sm:px-5"><p aria-live="polite" className="min-h-5 text-xs text-muted-foreground">{status || (hasChanges ? 'Inputs changed — run the estimate to update the comparison.' : 'Ready · deterministic demonstration model · no external data used.')}</p><p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{saved ? <><Check size={11} className="mr-1 inline text-primary" />Saved locally</> : 'Unsaved · this browser session'}</p></div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-border/70 pt-4 text-[10px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>AFTERMATH <span className="mx-1 text-primary">/</span> See the consequences. Change the outcome.</span><span>Demo calculations run in this browser; not server-validated or scientifically calibrated.</span><ChevronDown size={14} className="hidden sm:block" /></footer>
      </main>
    </div>
  )
}

function Outcome({ label, value, baseline, delta, unit, icon }: { label: string; value: string; baseline: string; delta: number; unit: string; icon: ReactNode }) {
  const improved = delta <= 0
  return <article className="rounded-xl border border-border/80 bg-background/55 p-3.5 transition-colors hover:border-primary/30 sm:p-4"><div className="flex items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">{label}</p><span className="text-primary">{icon}</span></div><div className="mt-2 flex items-baseline justify-between gap-2"><p className="font-serif text-2xl tracking-tight text-foreground">{value}</p><span className={`font-mono text-[10px] ${improved ? 'text-primary' : 'text-destructive'}`}>{delta > 0 ? '+' : ''}{delta} {unit}</span></div><p className="mt-1 text-[10px] text-muted-foreground">Baseline <span className="font-mono text-foreground">{baseline}</span></p></article>
}
