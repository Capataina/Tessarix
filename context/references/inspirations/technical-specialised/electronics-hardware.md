# Electronics & Hardware

---

### DigiSim.io

- **URL**: https://digisim.io/
- **What it does**: Drag-and-drop digital-logic editor with 50+ components (gates, ALUs, RAM, ROM, pixel screen, assembly program loader). Event-driven simulation engine propagates signals in real time. An 8-channel oscilloscope captures waveforms so users can spot race conditions. SimCast feature plays narrated, pauseable lessons where the circuit builds itself gate-by-gate with audio. Users can load assembly programs into RAM and watch the fetch-execute cycle run.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + live model inference (pattern 14, the sim engine) + multi-view pivot (pattern 4, circuit + oscilloscope).
- **For Tessarix**: The oscilloscope as a debug surface (signal over time) is a pattern applicable to attention scores per token, gradient magnitudes per layer, or loss curves per epoch. The SimCast "circuit assembles itself with narration" feature is a useful template for any algorithm whose construction order matters.

---

### EveryCircuit

- **URL**: https://everycircuit.com/
- **What it does**: Analog circuit simulator with live animated current flow (animated particle streams on wires), real-time oscilloscope traces, and adjustable components. Users flip switches, turn potentiometers, and change component values while the simulation is running. The oscilloscope auto-scales as signal frequencies and amplitudes change.
- **Interactive pattern**: Parameter sliders (pattern 7) + live model inference (pattern 14).
- **For Tessarix**: "Turn the knob, watch the waveform change" is directly analogous to hyperparameter tuning — adjust learning rate, watch the loss curve evolve. Pure real-time feedback loop. Strong fit for any Tessarix lesson where the concept is a continuous-parameter system.

---

### CircuitVerse

- **URL**: https://circuitverse.org/
- **What it does**: Collaborative browser-based digital logic simulator. Multi-bit wires, subcircuit abstraction, and a large component library. Circuits are shareable and forkable; an embedded circuit viewer lets educators embed circuits in lesson pages. Supports sequential circuits, flip-flops, and finite state machines.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + shareable scenario URLs (cross-cutting) + in-prose widgets (cross-cutting, via the embed viewer).
- **For Tessarix**: The embeddable circuit viewer — drop a live circuit into any page — is exactly the MDX widget model Tessarix is building toward. CircuitVerse is the most credible reference for "embeddable interactive simulator as a reusable primitive."

---

### dcaclab.com [seed]

- **URL**: https://dcaclab.com
- **What it does**: Browser-based circuit simulator for learners. Build circuits with drag-and-drop, measure with multimeter, oscilloscope, function generator. Pre-built lab experiments with step-by-step instructions guide the learner through structured scenarios.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + step-by-step advance (pattern 9) + scaffolded discovery (a soft form of game/puzzle constraint).
- **For Tessarix**: A clean example of "build the apparatus, measure it" as a learning loop. The structured experiments (vs free play) is a pattern: **scaffolded discovery** — give the reader a specific goal and the freedom to reach it. This is a useful intermediate between locked-prose gating (too coercive) and pure play (too unstructured).
