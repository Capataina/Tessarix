# Quantitative Finance

---

### Market Microstructure Order-Book Explorer (mbrenndoerfer)

- **URL**: https://mbrenndoerfer.com/writing/market-microstructure-order-book-mechanics
- **What it does**: An interactive essay embedding live order-book and microprice components alongside prose. The order-book section lets you read depth data and watch the microprice deviate from the midprice as imbalance shifts; metrics like spread, depth at multiple levels, and imbalance ratios update in real time.
- **Interactive pattern**: Parameter sliders (pattern 7) + in-prose widgets (cross-cutting) — adjust order-book parameters, watch all derived metrics recompute.
- **For Tessarix**: The "parameter → metric live-update" pattern is directly portable to teaching ML hyperparameter sensitivity (learning rate, batch size) or options Greeks with live payoff diagrams. A clean example of inline widget integration in a serious quantitative essay.

---

### Quantt [seed]

- **URL**: https://quantt.io (likely; user-cited, exact URL not yet verified)
- **What it does**: Interactive trading-strategy and pricing tools as a learning environment for quantitative finance. The user cited this as an example of vertical-specific interactive learning.
- **Interactive pattern**: Parameter sliders (pattern 7) + draw-and-simulate (pattern 10) + step-through (pattern 9) — varying by specific tool within the platform.
- **For Tessarix**: A specialised vertical example. Quant finance is a domain typically taught with dense formulas and academic prose; Quantt's bet is that interactivity helps the same way it helps in software. Worth a closer look when Tessarix adds quant-finance lessons (options theta, compounding, regime detection — per the README's M2 candidates). **URL verification needed before relying on as a reference.**
