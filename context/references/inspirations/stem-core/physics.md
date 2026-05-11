# Physics

---

### PhET Interactive Simulations

- **URL**: https://phet.colorado.edu/
- **What it does**: 100+ browser simulations where the reader grabs physical objects directly — a charged particle, a wave source, a mass on a spring. The quantum wave-interference sim lets you fire photons one at a time through a double slit and watch the interference pattern accumulate probabilistically. The circuit simulator lets you wire arbitrary circuits by dragging components.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + parameter sliders (pattern 7) + live model inference (pattern 14) of the physics.
- **For Tessarix**: The gold standard of "physics as a hands-on medium." The principle — "the simulation responds like the real thing, not like a graph of the real thing" — is transferable to algorithm visualisers. Any Tessarix physics module should aspire to PhET's standard of letting the reader change the physical setup, not just adjust a graph.

---

### myPhysicsLab

- **URL**: https://www.myphysicslab.com/
- **What it does**: Classical-mechanics simulations with draggable objects and parameter panels. The double-pendulum sim shows chaotic divergence from nearly identical initial conditions; the rigid-body engine handles contact forces. Drag mass endpoints to change initial conditions and watch the trajectory repaint.
- **Interactive pattern**: Parameter sliders (pattern 7) + state-overlay (pattern 15) for trajectory comparison.
- **For Tessarix**: "Drag initial conditions → watch trajectory re-run" is the pattern for teaching sensitive dependence on initial conditions (chaos) and Lagrangian mechanics. Worth adopting for any physics topic where the equation of motion is the lesson.

---

### Falstad Math/Physics Applets

- **URL**: https://www.falstad.com/mathphysics.html
- **What it does**: ~30 browser applets. The circuit simulator shows current as animated yellow dots flowing through any circuit the reader builds. The 1D quantum-mechanics applet lets the reader place potential wells and barriers and watch the wave function and energy eigenvalues update. The electrostatic applet lets the reader place charges and immediately see field lines and equipotentials.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + live model inference (pattern 14, the physics engine is real-time).
- **For Tessarix**: The circuit animator — colour-coded voltage with animated current dots — is one of the most efficient mental models ever built for a physics concept. "Make the invisible (current flow) visible and responsive to the user's circuit" is a design principle Tessarix should apply to hidden state in data structures and algorithms.

---

### oPhysics

- **URL**: https://ophysics.com/
- **What it does**: ~60 GeoGebra-powered simulations. Each presents a physical scenario with labelled sliders for the relevant parameters (mass, velocity, angle, charge) and the simulation re-runs immediately when any slider changes. Graphs of position, velocity, acceleration update alongside the animation.
- **Interactive pattern**: Parameter sliders (pattern 7) + multi-view pivot (pattern 4) for simultaneous animation + graphs.
- **For Tessarix**: Side-by-side layout — simulation on the left, graph on the right, both updating from the same slider — is the best way to build the connection between a physical phenomenon and its mathematical representation. Tessarix's widget layout could adopt this split-panel pattern for any concept with both a visual and a quantitative representation.

---

### Quantum Game (Quantum Flytrap)

- **URL**: https://quantumgame.io/
- **What it does**: Puzzle game where each level is an optical table. The reader places beam splitters, mirrors, wave plates, and detectors to route photons through the correct path. Shows quantum superposition: a photon simultaneously traverses multiple paths, and the reader sees both amplitude and phase represented visually.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + game/puzzle constraint structure (cross-cutting) + break-it-to-understand (pattern 11, soft form).
- **For Tessarix**: Teaches quantum superposition — one of the most abstractly resistant topics in physics — through direct manipulation of apparatus. The puzzle-constraint format ("you have these components, achieve this output") is a transferable pattern for teaching algorithmic constraints: "you have these operations, produce this output."
