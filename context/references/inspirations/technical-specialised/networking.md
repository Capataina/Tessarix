# Networking & Systems Design

---

### The Illustrated TLS 1.3 / QUIC / DTLS (xargs.org)

- **URL**: https://tls13.xargs.org/ + https://quic.xargs.org/ + https://dtls.xargs.org/
- **What it does**: A real TLS session (client → server → "pong") is captured and annotated byte by byte. Every record is expandable: hex bytes appear alongside human-readable field names and explanations. An "Open All" button unfolds the full session; individual sections (ClientHello, ServerHello, handshake, app data) collapse independently. Each record includes the shell commands to regenerate it.
- **Interactive pattern**: Scroll-driven (pattern 2) + step-by-step advance (pattern 9) + reproducible from primary source (cross-cutting) — every claim is verifiable from real cryptographic primitives.
- **For Tessarix**: "Scroll reveals the next layer of depth, collapse to zoom out" translates directly to teaching packet structures, neural-network forward passes layer-by-layer, or transformer attention heads. The xargs.org family is the pedagogical bar for protocol documentation — nothing else comes close to its combination of byte-level depth and reproducibility.

---

### The Secret Lives of Data — Raft

- **URL**: https://thesecretlivesofdata.com/raft/
- **What it does**: Click-through animated story of the Raft protocol. Nodes appear as circles; the user advances through election timeout → RequestVote → leader election → log replication → network partition scenarios one frame at a time. Also includes an Apache Kafka basics visualisation.
- **Interactive pattern**: Step-by-step advance (pattern 9) at protocol-phase granularity.
- **For Tessarix**: The "click to advance the state machine — freeze time, read the annotation, advance" pattern is one of the most effective ways to teach any protocol, algorithm, or training-loop step. Direct template for any Tessarix lesson on a multi-actor protocol or consensus algorithm.

---

### Protocols Visualizer

- **URL**: https://protocols-visualizer.vercel.app/
- **What it does**: Three modes: (1) Communication Flow — animated sequence diagrams of protocols executing step by step; (2) Packet Anatomy — interactive header field explorer for TCP, IP, Ethernet, DNS packets; (3) Attack Simulation — visual walkthroughs of SYN flood, ARP spoofing, de-auth, Bad USB.
- **Interactive pattern**: Step-by-step advance (pattern 9) + bidirectional highlight (pattern 3, field ↔ explanation) + break-it-to-understand (pattern 11, the attack mode).
- **For Tessarix**: The packet-anatomy field-expansion pattern (click a field, see its meaning and bit layout) maps cleanly to dataclass field inspection, tensor shape annotation, or IR instruction decoding. Three modes combined in one tool is a useful structure — show normal flow, drill into structure, then show failure modes.

---

### BGPlay — BGP Routing Visualiser

- **URL**: https://bgplay.massimocandela.com/
- **What it does**: Graphical visualisation of BGP routing events over time. Users select a prefix and time range, then scrub through route-update events to watch how path announcements and withdrawals propagate across autonomous systems. Each AS is a node; edges show active BGP sessions and the selected best-path.
- **Interactive pattern**: Time-scrubber (pattern 8) + step-by-step advance (pattern 9, frame-by-frame option) — combined.
- **For Tessarix**: Time-scrubbing over a distributed state change is a powerful pattern applicable to gradient-descent checkpoints, consensus log entries, compilation pass outputs, version-control branching. The combination of coarse scrub + fine step-advance is the model.

---

### ByteByteGo [seed]

- **URL**: https://bytebytego.com
- **What it does**: Heavy use of illustrated diagrams to explain systems-design concepts (caching, load balancers, consensus, sharding, message queues, etc.). Mostly static SVG diagrams paired with prose, NOT primarily interactive — but the diagram density and visual clarity is exceptional.
- **Interactive pattern**: **Not primarily interactive.** The pattern is "illustration as primary teaching artefact" with high information density per diagram.
- **For Tessarix**: A counter-example for Tessarix's bet on interactivity — ByteByteGo's quality comes from diagram craft, not interaction. For Teach pillar diagrams where interaction is the wrong tool (the user explicitly cited this constraint in the README inspirations table), aspire to ByteByteGo's visual density. Note the limitation: this is an inspiration for *static diagrams within Tessarix lessons*, not for interactive widgets.
