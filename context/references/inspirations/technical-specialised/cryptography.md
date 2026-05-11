# Cryptography

---

### The Animated Elliptic Curve

- **URL**: https://curves.xargs.org/
- **What it does**: Animated walkthroughs of point addition, scalar multiplication, and the double-and-add algorithm on elliptic curves. Culminates in a live key-exchange simulator: the user enters Alice's and Bob's private keys (or hits "Go Random"), and the page animates how their public keys and shared secret derive from the same curve point.
- **Interactive pattern**: Parameter sliders / inputs (pattern 7) + step-by-step advance (pattern 9) + reproducible from primary source (cross-cutting — every step is annotated with the actual math).
- **For Tessarix**: "Parameterise the crypto primitive, watch the math unfold" is the directly adaptable pattern. Works for any parametric mathematical concept — activation functions, attention weights, Fourier transforms. The xargs.org family (TLS / QUIC / DTLS / Curves) is a master class in byte-level technical pedagogy.

---

### CryptoHack

- **URL**: https://cryptohack.org/
- **What it does**: 260+ graded CTF-style challenges across 13 categories. Each challenge isolates one cryptographic primitive or vulnerability (padding oracle, CBC bit-flipping, ECDSA nonce reuse, lattice reduction). Many challenges connect to live servers over the network so users can perform man-in-the-middle attacks, interact with an oracle, or drive a Diffie-Hellman session.
- **Interactive pattern**: Break-it-to-understand (pattern 11) — the strongest exemplar in the catalog + game/puzzle constraint structure (cross-cutting) + draw-and-simulate (pattern 10, the user writes the attack code).
- **For Tessarix**: The "break it to understand it" pedagogy — understanding a primitive by attacking it — is a strong teaching pattern for any system concept (understand MVCC by causing anomalies; understand attention by corrupting it; understand consensus by partitioning the cluster). Strong fit for the Interview pillar's adversarial rehearsal mode.

---

### CipherFlow — Cipher Visualizer

- **URL**: https://powergr.github.io/cipherflow-visualizer/
- **What it does**: Step-by-step animated walkthroughs of cipher algorithms. Users watch how plaintext bytes flow through substitution, permutation, and key-mixing rounds as the encryption progresses. Both classical (Caesar, Vigenère) and modern (AES) modes are covered.
- **Interactive pattern**: Step-by-step advance (pattern 9) at byte granularity.
- **For Tessarix**: The "data flows through a pipeline, highlight the transformation at each stage" pattern applies directly to neural-network forward passes, compiler IR lowering, or database query-plan execution stages. The byte-granularity step-through is a benchmark for how fine-grained step-by-step advance can usefully go.

---

### Elliptic Curve Playground (bren2010)

- **URL**: https://bren2010.github.io/ec-playground/
- **What it does**: Choose a curve and modulus, generate a cyclic group, then add and multiply points. An animated chord-and-tangent helper visually derives the group law step by step for each operation. The group table updates live.
- **Interactive pattern**: Parameter sliders (pattern 7) + step-by-step advance (pattern 9) + draw-and-simulate (pattern 10, you pick the points).
- **For Tessarix**: Pure mathematical-object manipulation with animated proof. The pattern works for matrix multiplication, convolution, Fourier transforms — any mathematical operation where the result is less interesting than the process.
