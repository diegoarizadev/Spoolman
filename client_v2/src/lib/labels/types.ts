// Label-designer data model. All geometry is in millimeters — device-independent
// so the same design renders identically on screen (mm→px at an editor scale) and
// on paper (mm→px at the printer's DPI). Designs are persisted as a JSON array in
// the `label_designs` server setting (see $lib/api/labelDesigns).

import { DEFAULT_EXPORT_FORMAT, type ExportFormatId } from './export';

export type ElementType = 'qr' | 'text' | 'swatch' | 'rect';

/**
 * What real-world entity a design labels. A `spool` label binds to a single spool
 * (and its filament/vendor); a `filament` label binds to a filament (and its
 * vendor) with no spool — spool-only fields are dropped and its QR links to the
 * filament instead of a spool. A `purge` label binds to one purge-library entry:
 * `{filament.*}` and `{vendor.*}` resolve to its outgoing filament, `{purge.*}` to the
 * purge itself and the incoming filament, and its QR links to the purge. Defaults to
 * `spool` when absent on older designs.
 */
export type LabelKind = 'spool' | 'filament' | 'purge';

/** Fields common to every element: an id and a top-left position in mm. */
interface BaseElement {
	id: string;
	type: ElementType;
	/** Top-left corner, millimeters from the label's top-left. */
	x: number;
	y: number;
}

/** A QR code encoding a link back to the spool. Always square. */
export interface QrElement extends BaseElement {
	type: 'qr';
	/** Side length in mm. */
	size: number;
	/**
	 * Error-correction level. Fixed at 'H' (highest redundancy) so a centre logo
	 * never breaks scanning; not exposed in the UI.
	 */
	ec: 'L' | 'M' | 'Q' | 'H';
	/**
	 * `scheme` → `WEB+SPOOLMAN:S-<id>` (compact, scanned by the Spoolman apps).
	 * `url` → `<base_url>/spool/show/<id>` (opens in any browser).
	 * `custom` → the user's {@link urlTemplate} with `{id}` substituted; lets a
	 * printed QR point at a third-party scanner/app or a different host. Such a
	 * code won't round-trip back into Spoolman's own scanner.
	 */
	encoding: 'scheme' | 'url' | 'custom';
	/**
	 * Template used when `encoding === 'custom'`. `{id}` is replaced with the
	 * label's subject id, and label fields like `{filament.id}` are resolved too.
	 * Ignored otherwise.
	 */
	urlTemplate?: string;
	/** Draw the Spoolman logo in the centre of the code. */
	logo: boolean;
}

/** A text block whose `template` may contain `{placeholder}` tags resolved per spool. */
export interface TextElement extends BaseElement {
	type: 'text';
	/** Wrap width in mm. Height grows with content. */
	w: number;
	/** Font size in mm. */
	fontSize: number;
	bold: boolean;
	align: 'left' | 'center' | 'right';
	color: string;
	/**
	 * When true (default), text wraps within `w`. When false, each line stays on
	 * one line and any overflow past `w` is clipped (hidden).
	 */
	wrap: boolean;
	/** e.g. "**{filament.name}**\n{filament.material}" — see labels/template.ts. */
	template: string;
}

/** A rectangle filled with the spool's filament color(s). */
export interface SwatchElement extends BaseElement {
	type: 'swatch';
	w: number;
	h: number;
	/** Corner radius in mm. */
	radius: number;
	/**
	 * Purge labels only: which filament of the purge to take the colour from, the
	 * outgoing one (`from`, the default) or the incoming one (`to`).
	 */
	side?: 'from' | 'to';
}

/** A static rectangle / border for decoration (no per-spool data). */
export interface RectElement extends BaseElement {
	type: 'rect';
	w: number;
	h: number;
	radius: number;
	/** Fill color, or '' for no fill (outline only). */
	fill: string;
	stroke: string;
	/** Stroke width in mm. */
	strokeWidth: number;
}

export type LabelElement = QrElement | TextElement | SwatchElement | RectElement;

export interface LabelDesign {
	id: string;
	name: string;
	/**
	 * Whether this design labels spools or filaments. Optional for backward
	 * compatibility with designs saved before filament labels existed — read it
	 * through {@link labelKind}, which defaults a missing value to `spool`.
	 */
	kind?: LabelKind;
	/** Physical label size in mm. */
	label: { w: number; h: number };
	elements: LabelElement[];
	/** Sheet/label print layout, saved per-design (see PrintLayout below). */
	layout: PrintLayout;
}

/** A design's label kind, defaulting a missing (pre-filament-labels) value to `spool`. */
export function labelKind(d: Pick<LabelDesign, 'kind'>): LabelKind {
	return d.kind ?? 'spool';
}

// --- Print layout ----------------------------------------------------------

export type PaperName = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'custom';

export interface PrintLayout {
	/**
	 * `sheet` tiles many labels on one page; `label` prints one label per page;
	 * `image` skips the printer entirely and downloads the labels as files.
	 */
	mode: 'sheet' | 'label' | 'image';
	/**
	 * Which file format `image` mode saves. Ids come from the export registry
	 * (see $lib/labels/export) and are resolved leniently, so a design saved by a
	 * newer client naming a format this build lacks falls back to PNG.
	 */
	exportFormat: ExportFormatId;
	/**
	 * Raster resolution in dots per inch for both printing and image export.
	 * Matching the printer's native density is what keeps small labels sharp:
	 * most thermal label printers are 203 dpi, laser/inkjet 300+. A mismatch makes
	 * the driver resample, which is the usual cause of blurry QR codes.
	 */
	dpi: number;
	paper: PaperName;
	/** Used when `paper === 'custom'`, in mm. */
	custom: { w: number; h: number };
	landscape: boolean;
	/**
	 * Page margins in mm (sheet mode only): where the label grid begins, measured
	 * from the paper edges. These size and position the grid.
	 */
	margin: { t: number; b: number; l: number; r: number };
	/**
	 * Printer safe-zone in mm (sheet mode only): how close to the paper edge the
	 * printer can actually print. Unlike `margin` this does NOT move the grid — it
	 * only insets the content of the edge labels inward when the safe-zone is larger
	 * than the corresponding margin, so nothing gets clipped by the printer.
	 */
	safe: { t: number; b: number; l: number; r: number };
	/**
	 * Number of columns in the sheet grid (sheet mode only). The label size is fixed
	 * by the design, so the user picks how many of those labels sit side by side;
	 * rows then fill down the page automatically. (Label width × columns can exceed
	 * the paper — the panel warns when it does.)
	 */
	columns: number;
	/** Gap between adjacent labels in mm (sheet mode only). */
	spacing: { h: number; v: number };
	/** Blank cells to skip before the first label (for reusing partial sheets). */
	skip: number;
	/** Copies of each selected spool's label. */
	copies: number;
	/** Cut-guide drawing around each cell. */
	border: 'none' | 'border';
}

export const DEFAULT_LAYOUT: PrintLayout = {
	mode: 'sheet',
	exportFormat: DEFAULT_EXPORT_FORMAT,
	dpi: 300,
	paper: 'A4',
	custom: { w: 50, h: 25 },
	landscape: false,
	margin: { t: 10, b: 10, l: 10, r: 10 },
	safe: { t: 0, b: 0, l: 0, r: 0 },
	columns: 3,
	spacing: { h: 2, v: 2 },
	skip: 0,
	copies: 1,
	border: 'none'
};

/**
 * Default "meta" line of a fresh spool label: the material followed by the spool
 * id. The material sits in a conditional block so the separator disappears along
 * with it when the filament has no material set.
 */
export const DEFAULT_SPOOL_TEXT = '{{filament.material} · }#{spool.id}';
/** Same line for a fresh filament label — a spool id makes no sense here, so it
 * ends in the filament id instead. */
export const DEFAULT_FILAMENT_TEXT = '{{filament.material} · }#{filament.id}';
/** Same line for a fresh purge label: the purge volume and nozzle (the id is in the QR). */
export const DEFAULT_PURGE_TEXT = '{purge.volume} mm³ · {purge.nozzle} mm';
/** A purge label's headline names both filaments: where it purges from and to. */
export const DEFAULT_PURGE_NAME = '{filament.name} → {purge.to.name}';
/**
 * Two filament names don't fit the headline's usual size on a small label, so a
 * purge label's headline is set smaller than a spool's (and put back on the way out).
 */
const HEADLINE_FONT = 3.2;
const PURGE_HEADLINE_FONT = 2.4;

/**
 * Spool/filament template pairs that count as "still the default", newest first.
 * The trailing entries are the defaults shipped by earlier versions, kept so that
 * designs created before the default was redesigned still get their id line
 * retargeted when their kind is switched.
 */
const DEFAULT_TEXT_PAIRS: Record<LabelKind, string>[] = [
	{ spool: DEFAULT_SPOOL_TEXT, filament: DEFAULT_FILAMENT_TEXT, purge: DEFAULT_PURGE_TEXT },
	// The headline: the outgoing filament's name, which is also the purge label's
	// first half, so only the purge kind adds the incoming filament.
	{ spool: '{filament.name}', filament: '{filament.name}', purge: DEFAULT_PURGE_NAME },
	{
		spool: '**{filament.name}**\n{filament.material}\n#{spool.id}',
		filament: '**{filament.name}**\n{filament.material}\n#{filament.id}',
		purge: '**{filament.name}**\n{filament.material}\n#{purge.id}'
	}
];

/** The default text-block template for a given label kind. */
export function defaultTextTemplate(kind: LabelKind): string {
	if (kind === 'filament') return DEFAULT_FILAMENT_TEXT;
	return kind === 'purge' ? DEFAULT_PURGE_TEXT : DEFAULT_SPOOL_TEXT;
}

/** Gap in mm between the two halves of a swatch that a purge label splits in two. */
const PURGE_SWATCH_GAP = 1;

/** Id of the incoming-colour half created when a swatch is split for a purge label. */
const toSwatchId = (id: string) => `${id}-to`;

/** Split every plain swatch into an outgoing half and an incoming half. */
function splitSwatches(elements: LabelElement[]): LabelElement[] {
	return elements.flatMap<LabelElement>((el) => {
		if (el.type !== 'swatch' || el.side) return [el];
		const w = (el.w - PURGE_SWATCH_GAP) / 2;
		return [
			{ ...el, w, side: 'from' as const },
			{ ...el, id: toSwatchId(el.id), x: el.x + w + PURGE_SWATCH_GAP, w, side: 'to' as const }
		];
	});
}

/** Undo {@link splitSwatches}: fold each pair back into one swatch spanning both. */
function mergeSwatches(elements: LabelElement[]): LabelElement[] {
	const byId = new Map(elements.map((el) => [el.id, el]));
	return elements.flatMap<LabelElement>((el) => {
		if (el.type !== 'swatch') return [el];
		if (el.side === 'to' && el.id.endsWith('-to') && byId.has(el.id.slice(0, -3))) return [];
		const { side, ...plain } = el;
		void side;
		const partner = byId.get(toSwatchId(el.id));
		if (el.side === 'from' && partner?.type === 'swatch') {
			return [{ ...plain, w: partner.x + partner.w - el.x }];
		}
		return [plain];
	});
}

/**
 * Switch a design's label kind in place, retargeting any text block that still
 * carries the *other* kind's default template to this kind's default — so a fresh
 * spool label's `#{spool.id}` line becomes `#{filament.id}` for a filament label,
 * and vice versa. Templates the user has edited are left untouched.
 */
export function setDesignKind(design: LabelDesign, kind: LabelKind): void {
	const from = labelKind(design);
	design.kind = kind;
	if (from === kind) return;
	design.elements = design.elements.map((el) => {
		if (el.type !== 'text') return el;
		const pair = DEFAULT_TEXT_PAIRS.find((p) => p[from] === el.template);
		if (!pair) return el;
		const next = { ...el, template: pair[kind] };
		if (pair[kind] === DEFAULT_PURGE_NAME && el.fontSize === HEADLINE_FONT)
			next.fontSize = PURGE_HEADLINE_FONT;
		else if (pair[from] === DEFAULT_PURGE_NAME && el.fontSize === PURGE_HEADLINE_FONT)
			next.fontSize = HEADLINE_FONT;
		return next;
	});
	// A purge label shows both colours; any other kind shows one.
	if (kind === 'purge') design.elements = splitSwatches(design.elements);
	else if (from === 'purge') design.elements = mergeSwatches(design.elements);
}

/**
 * A fresh design at a sensible default size, laid out as: QR on the left, and on
 * the right a manufacturer line, the filament name, a material · id line, and a
 * colour swatch bar bottom-aligned with the QR. Every text block is a separate
 * element because styling (size, weight, colour) is per-element — that's what
 * lets the name read as the headline and the manufacturer as a subtitle.
 */
export function newDesign(id: string): LabelDesign {
	return {
		id,
		name: 'Untitled label',
		kind: 'spool',
		label: { w: 50, h: 25 },
		layout: structuredClone(DEFAULT_LAYOUT),
		elements: [
			{ id: `${id}-qr`, type: 'qr', x: 2, y: 2, size: 21, ec: 'H', encoding: 'scheme', logo: true },
			{
				// Conditional block: a filament with no vendor prints nothing here
				// rather than a stray "?".
				id: `${id}-vendor`,
				type: 'text',
				x: 25,
				y: 2.2,
				w: 23,
				fontSize: 2.5,
				bold: false,
				align: 'left',
				color: '#555555',
				wrap: false,
				template: '{{vendor.name}}'
			},
			{
				// The headline. The only wrapping block, so a long name grows into the
				// gap above the meta line instead of being clipped.
				id: `${id}-name`,
				type: 'text',
				x: 25,
				y: 5.4,
				w: 23,
				fontSize: 3.2,
				bold: true,
				align: 'left',
				color: '#000000',
				wrap: true,
				template: '{filament.name}'
			},
			{
				id: `${id}-meta`,
				type: 'text',
				x: 25,
				y: 15.2,
				w: 23,
				fontSize: 2.5,
				bold: false,
				align: 'left',
				color: '#333333',
				wrap: false,
				template: DEFAULT_SPOOL_TEXT
			},
			// Bottom-aligned with the QR (both end at y=23) so the label reads as two
			// balanced columns.
			{ id: `${id}-swatch`, type: 'swatch', x: 25, y: 19, w: 23, h: 4, radius: 1.2 }
		]
	};
}
