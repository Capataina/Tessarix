# Quantum Computing

---

### Quirk — Quantum Circuit Simulator

- **URL**: https://algassert.com/quirk
- **What it does**: Drag-and-drop gates onto a qubit canvas; the state vector, amplitude bars, and Bloch spheres update in real time as you build. Pre-loaded examples include Grover search, Shor period-finding, quantum teleportation, and the quantum Fourier transform. Circuits are URL-encoded so you can bookmark and share exact states. Supports up to 16 qubits. Custom gates can be defined by matrix or by nesting circuits.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + live model inference (pattern 14) + shareable scenario URLs (cross-cutting).
- **For Tessarix**: The cleanest known example of "drag a primitive, watch the global state update." The pattern maps directly to neural-network layer wiring (add a conv layer, watch the feature map change), FSM construction, type-inference derivation trees. The URL-encoded circuits is also the canonical example of the "shareable scenario URL" cross-cutting property — copy verbatim.

---

### Quantum Computing Playground

- **URL**: https://www.quantumplayground.net/
- **What it does**: A WebGL-powered simulator with its own scripting IDE, two-way debugger, and real-time quantum state visualisation (probability amplitudes rendered in 3D). Users write scripts, step through them with the debugger, and watch the state evolve visually.
- **Interactive pattern**: Step-by-step advance (pattern 9, the debugger) + live model inference (pattern 14) + bidirectional highlight (pattern 3, code ↔ amplitude state).
- **For Tessarix**: The "write code, see the mathematical object it manipulates" pattern works for teaching computational graphs, backpropagation, parse trees, and any topic where source code and mathematical state should be kept in sync visually.

---

### Black Opal by Q-CTRL [seed]

- **URL**: https://q-ctrl.com/black-opal
- **What it does**: An interactive quantum-computing course aimed at non-physicists. Build quantum circuits, manipulate qubits, learn through doing rather than reading. Polished commercial production with structured progression through lessons.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + step-by-step advance (pattern 9) + locked-prose gating (pattern 1) — multi-pattern composition.
- **For Tessarix**: A polished commercial example of multi-pattern composition. Reference for the maturity bar Tessarix should aspire to for production lessons — the integration of gating + drag-to-build + step-through into a single coherent flow is what M2-era Tessarix should look like.
