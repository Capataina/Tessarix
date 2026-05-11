# Anatomy & Medicine

---

### Zygote Body — 3D Anatomy Layer Peeler

- **URL**: https://www.zygotebody.com/
- **What it does**: A full 3D human body in the browser. An opacity slider on the left peels away layers from skin → fat → muscle → nerve → bone. Individual structures can be isolated, labelled, and rotated. Every layer is independently toggleable.
- **Interactive pattern**: Layer-peel via opacity (pattern 13) — the strongest exemplar in the catalog + parameter sliders (pattern 7) on rotation/zoom.
- **For Tessarix**: "Peel away abstraction layers to reveal what's beneath" is the canonical pattern for teaching OS internals, compiler passes, or network stacks. Toggle the HTTP layer off and see TCP; toggle TCP off and see IP. The slider-as-abstraction-depth control is a direct steal. Implement as `<LayerPeel>` MDX component — N stacked SVG/Canvas layers with independent opacity controls.

---

### BioDigital Human — Clinical 3D Platform

- **URL**: https://www.biodigital.com/
- **What it does**: Clinical-grade 3D anatomy where you can isolate any organ system, annotate it, simulate a surgical procedure, or view a disease state overlaid on the healthy model. The "condition" layer shows pathological changes on top of normal anatomy.
- **Interactive pattern**: Layer-peel (pattern 13) + state-overlay (pattern 15, healthy vs diseased) — strong composition.
- **For Tessarix**: "Overlay a pathological state on top of the normal state" translates to showing a buggy execution trace overlaid on the correct one, or an adversarial input overlaid on a normal one in an ML visualiser. The clinical guided-tour authoring (educators build their own annotated walkthroughs) is also a useful pattern for lesson authors creating custom annotated paths through complex widgets.
