# Technical Specialised Inspirations

Tools for highly specialised, quantitative, or technical domains: quant finance, quantum computing, cryptography, electronics, networking, databases, compilers, operating systems, blockchain. These domains traditionally rely heavily on prose explanation; the tools here are the counter-examples.

## Files

| File | Tools | Topics |
|---|---|---|
| [`quant-finance.md`](quant-finance.md) | 2 | Order-book mechanics, derivatives, market microstructure |
| [`quantum-computing.md`](quantum-computing.md) | 3 | Circuit builders, simulators, courseware |
| [`cryptography.md`](cryptography.md) | 4 | ECC, AES, CTF-style challenges, RSA |
| [`electronics-hardware.md`](electronics-hardware.md) | 4 | Digital + analog circuit simulators, embedded |
| [`networking.md`](networking.md) | 5 | TLS / QUIC byte-level walkthrough, Raft, packet inspection, BGP, system-design illustration |
| [`databases.md`](databases.md) | 3 | B-trees, MVCC, query optimisers |
| [`compilers-languages.md`](compilers-languages.md) | 3 | Compiler Explorer, AST Explorer, FSM simulators |
| [`os-systems.md`](os-systems.md) | 2 | Memory tools, execution-state visualisers |
| [`blockchain.md`](blockchain.md) | 2 | EVM debugger, Ethereum documentation |

## Strongest exemplars to study first

1. **Quirk** (`quantum-computing.md`) — the cleanest known "drag a primitive, watch the global state update" widget. Direct template for any tile-based authoring widget.
2. **The Illustrated TLS / QUIC / DTLS** (`networking.md`) — byte-level reproducible walkthroughs. The pedagogical bar for protocol documentation; nothing else comes close.
3. **Compiler Explorer (Godbolt)** (`compilers-languages.md`) — bidirectional highlight at scale. 40+ languages, the dominant interactive site for systems-programming pedagogy.

## Patterns most represented in technical specialised

- Step-by-step state advance (pattern 9): Secret Lives of Data (Raft), Python Tutor, Tenderly, CipherFlow, FSM Simulator — the dominant pattern in this group.
- Bidirectional highlight (pattern 3): AST Explorer, Compiler Explorer.
- Draw-and-simulate (pattern 10): Quirk, CircuitVerse, DigiSim, EveryCircuit, LOOPY-adjacent tooling.
- Break-it-to-understand (pattern 11): CryptoHack — the strongest exemplar in the catalog.

## A note on seed examples in this folder

Four of the user's original seed examples land here:

- **ByteByteGo** (in `networking.md` — though it spans systems design broadly) — *not strongly interactive*; included for completeness with limitation noted.
- **Black Opal by Q-CTRL** (in `quantum-computing.md`) — polished commercial example of multi-pattern composition.
- **Quantt** (in `quant-finance.md`) — quant finance interactive learning.
- **dcaclab** (in `electronics-hardware.md`) — drag-and-drop circuit simulator with structured experiments.
- **ethereum.org docs** (in `blockchain.md`) — minimal interactivity (just inline end-of-page assessments), but cited as inspiration for the floor pattern of "inline knowledge checks."
