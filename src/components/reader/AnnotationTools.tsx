import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight, Bold, BookOpen, Check, ChevronDown, Eraser,
  Highlighter, Italic, MessageSquare, Network, PenTool,
  Pencil, Plus, Trash2, X,
} from "lucide-react";
import type { Annotation } from "@/lib/storage";

export type TextAnchor = { start: number; end: number; quote: string };
type AddNote = (kind: Annotation["kind"], text?: string, image?: string) => Promise<void>;
type RemoveNote = (id: string) => Promise<void>;

export function AnnotationToolbar({
  selection, onStyle, onErase, onComment, onSketch, onDiagram, onNotes,
}: {
  selection: TextAnchor | null;
  onStyle: (kind: "bold" | "italic" | "highlight") => void;
  onErase: () => void;
  onComment: () => void;
  onSketch: (kind: "draw" | "sketch") => void;
  onDiagram: () => void;
  onNotes: () => void;
}) {
  return <div className="katha-annotation-toolbar" role="toolbar" aria-label="Reading annotations">
    <button onClick={() => onStyle("bold")} title="Mark selected words bold"><Bold size={19}/><span>Bold</span></button>
    <button onClick={() => onStyle("italic")} title="Mark selected words italic"><Italic size={19}/><span>Italic</span></button>
    <button onClick={() => onStyle("highlight")} title="Highlight selected words"><Highlighter size={19}/><span>Highlight</span></button>
    <button onClick={onComment} title="Comment on selected words"><MessageSquare size={19}/><span>Comment</span></button>
    <button onClick={onErase} title="Erase selected text formatting"><Eraser size={19}/><span>Eraser</span></button>
    <button onClick={() => onSketch("draw")} title="Freehand drawing"><PenTool size={19}/><span>Draw</span></button>
    <button onClick={() => onSketch("sketch")} title="Fine line sketch"><Pencil size={19}/><span>Sketch</span></button>
    <button onClick={onDiagram} title="Create a simple flow diagram"><Network size={19}/><span>Diagram</span></button>
    <button onClick={onNotes} title="Show parallel notes"><BookOpen size={19}/><span>Notes</span></button>
    <span className="katha-annotation-selection" aria-live="polite">{selection ? "Text selected" : "Tap text to mark"}</span>
  </div>;
}

export function ParallelNotes({
  notes, onClose, onAdd, onRemove, onJump, anchor, visible, commentSignal = 0,
}: {
  notes: Annotation[];
  onClose: () => void;
  onAdd: AddNote;
  onRemove: RemoveNote;
  onJump: (index: number) => void;
  anchor: TextAnchor | null;
  visible: boolean;
  commentSignal?: number;
}) {
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (commentSignal > 0) setComposing(true); }, [commentSignal]);
  if (!visible) return null;
  return <aside className="katha-parallel-notes" role="complementary" aria-label="Parallel notes">
    <div className="katha-notes-heading">
      <div><span>THE MARGINS OF YOUR STORY</span><h2><BookOpen size={21}/> Parallel notes</h2></div>
      <button aria-label="Close parallel notes" className="katha-round" onClick={onClose}><X size={19}/></button>
    </div>
    <p className="katha-notes-intro">Comments, text marks, drawings and diagrams stay with this book on your device.</p>
    <div className="katha-notes-list">
      {!notes.length && <p className="katha-note-empty">Your margins are waiting. Select a line to begin a note.</p>}
      {notes.map((note) => <div key={note.id} className="katha-note-card">
        <div className="katha-note-head">
          <strong>{note.kind === "comment" ? "Comment" : note.kind === "drawing" ? "Sketch" : note.kind === "diagram" ? "Diagram" : note.kind === "highlight" ? "Highlight" : note.kind === "bold" ? "Bold passage" : "Italic passage"}</strong>
          <button aria-label={"Delete " + note.kind + " annotation"} onClick={() => void onRemove(note.id)}><Trash2 size={15}/></button>
        </div>
        {note.quote && <button className="katha-note-quote" onClick={() => note.start !== undefined && onJump(note.start)}>
          “{note.quote.length > 155 ? note.quote.slice(0, 155) + "…" : note.quote}”
        </button>}
        {note.text && <p>{note.text}</p>}
        {note.kind === "drawing" && note.image && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(note.image) && <img src={note.image} alt="Your saved drawing" className="katha-note-drawing"/>}
        {note.kind === "diagram" && note.text && <div className="katha-note-diagram" aria-label="Saved diagram">
          {note.text.split(" → ").map((step, i) => <span key={i}>{i > 0 && <ArrowRight size={13}/>}<b>{step}</b></span>)}
        </div>}
      </div>)}
    </div>
    {composing ? <div className="katha-note-composer">
      <label htmlFor="katha-note-text">New comment</label>
      <textarea id="katha-note-text" rows={4} maxLength={1500} value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write a thought about this passage…" />
      {anchor && <small>Attached to: “{anchor.quote.slice(0, 80)}”</small>}
      {error && <p role="alert">{error}</p>}
      <div className="katha-modal-actions">
        <button className="katha-ghost-button" onClick={() => { setComposing(false); setError(null); }}>Cancel</button>
        <button className="katha-primary-action" disabled={busy || !draft.trim()}
          onClick={async () => { setBusy(true); try { await onAdd("comment", draft.trim()); setDraft(""); setComposing(false); setError(null); }
            catch(e) { setError(e instanceof Error ? e.message : "Could not save note."); } finally { setBusy(false); } }}>
          <Check size={15}/> Save comment
        </button>
      </div>
    </div> : <button className="katha-note-add" onClick={() => setComposing(true)}><Plus size={18}/> Add note</button>}
  </aside>;
}

/** Touch- and pointer-friendly annotation canvas. This never draws the scenic environment. */
export function DrawingPad({ mode, onClose, onSave }: {
  mode: "draw" | "sketch";
  onClose: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(mode === "sketch" ? 2 : 5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const xy = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height),
    };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = xy(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = event.currentTarget.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(last.current.x + 0.1, last.current.y + 0.1);
      ctx.strokeStyle = eraser ? "rgba(0,0,0,1)" : "#f7d49f";
      ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const next = xy(event);
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = "#f7d49f";
    ctx.lineWidth = eraser ? size * 4 : size;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(next.x, next.y); ctx.stroke();
    last.current = next;
  };
  const end = () => { drawing.current = false; last.current = null; };
  return <div className="katha-modal-backdrop">
    <button className="katha-modal-scrim" onClick={onClose} aria-label="Close drawing pad"/>
    <section role="dialog" aria-modal="true" aria-label={mode === "draw" ? "Drawing pad" : "Sketch pad"} className="katha-modal katha-drawing-modal">
      <div className="katha-modal-head"><div><span>YOUR MARGINS</span><h2>{mode === "draw" ? "Draw a thought" : "Sketch a thought"}</h2></div>
        <button onClick={onClose} className="katha-round" aria-label="Close"><X size={18}/></button></div>
      <p>Draw with your finger or stylus. This sketch is saved alongside the current passage.</p>
      <canvas ref={canvasRef} width={640} height={340} aria-label="Freehand annotation canvas"
        className="katha-sketch-canvas"
        onPointerDown={start} onPointerMove={move} onPointerUp={end}
        onPointerCancel={end} onLostPointerCapture={end}/>
      <div className="katha-modal-actions">
        <button aria-pressed={!eraser} onClick={() => setEraser(false)} className="katha-ghost-button"><Pencil size={16}/> Pen</button>
        <button aria-pressed={eraser} onClick={() => setEraser(true)} className="katha-ghost-button"><Eraser size={16}/> Eraser</button>
        <label className="katha-pen-size">Size <input aria-label="Brush size" type="range" min={1} max={16} value={size} onChange={(e) => setSize(Number(e.target.value))}/></label>
        <button onClick={() => canvasRef.current?.getContext("2d")?.clearRect(0, 0, 640, 340)} className="katha-ghost-button">Clear</button>
      </div>
      {err && <p role="alert" className="katha-form-error">{err}</p>}
      <button className="katha-primary-action katha-save-button" disabled={busy}
        onClick={async () => { const image = canvasRef.current?.toDataURL("image/png"); if (!image) return;
          setBusy(true); try { await onSave(image); } catch(e) { setErr(e instanceof Error ? e.message : "Cannot save drawing."); setBusy(false); } }}>
        Save drawing
      </button>
    </section>
  </div>;
}

export function DiagramPad({ onClose, onSave }: { onClose: () => void; onSave: (flow: string) => Promise<void> }) {
  const [steps, setSteps] = useState(["Beginning", "Discovery", "Resolution"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="katha-modal-backdrop">
    <button className="katha-modal-scrim" onClick={onClose} aria-label="Close diagram editor"/>
    <section role="dialog" aria-modal="true" aria-label="Diagram editor" className="katha-modal">
      <div className="katha-modal-head"><div><span>VISUAL THINKING</span><h2>Diagram</h2></div>
        <button onClick={onClose} aria-label="Close" className="katha-round"><X size={18}/></button></div>
      <p>Connect a few ideas into a simple flow, linked to the passage you are reading.</p>
      <div className="katha-diagram-preview">
        {steps.filter(Boolean).map((step,i) => <span key={i}>{i > 0 && <ArrowRight size={16}/>}<b>{step}</b></span>)}
      </div>
      {steps.map((step,index) => <input key={index} className="katha-field" maxLength={65}
        aria-label={"Diagram step " + (index+1)} value={step}
        onChange={(e) => setSteps((old) => old.map((s,i) => i === index ? e.target.value : s))}/>)}
      <div className="katha-modal-actions">
        <button disabled={steps.length >= 6} className="katha-ghost-button" onClick={() => setSteps((s) => [...s,"New idea"])}><Plus size={15}/> Add step</button>
        <button disabled={steps.length <= 2} className="katha-ghost-button" onClick={() => setSteps((s) => s.slice(0,-1))}><ChevronDown size={15}/> Remove last</button>
      </div>
      {error && <p role="alert" className="katha-form-error">{error}</p>}
      <button disabled={busy || steps.every((s) => !s.trim())} className="katha-primary-action katha-save-button"
        onClick={async () => { setBusy(true); try { await onSave(steps.filter((s) => s.trim()).join(" → ")); }
          catch(e) { setError(e instanceof Error ? e.message : "Could not save diagram."); setBusy(false); } }}>
        Save diagram
      </button>
    </section>
  </div>;
}
