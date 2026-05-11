# Climate Science

---

### En-ROADS Climate Solutions Simulator (Climate Interactive / MIT Sloan)

- **URL**: https://en-roads.climateinteractive.org/
- **What it does**: ~30 policy sliders (carbon tax, renewables subsidy, electrification rate, nuclear, deforestation, etc.) each connected to a live systems-dynamics model. Moving any slider immediately redraws the global temperature trajectory, sea level, energy mix, and GDP curves. Used by 1.5 million people across 22 languages; peer-reviewed in *npj Climate Action*. Shareable scenario URLs encode the full slider state.
- **Interactive pattern**: Parameter sliders driving a causal system (pattern 7) — the densest exemplar in the catalog + state-overlay (pattern 15, baseline vs your scenario) + shareable scenario URLs (cross-cutting) + live model inference (pattern 14, the systems-dynamics model runs in real time).
- **For Tessarix**: This is the canonical "multi-parameter causal system where you can see feedback" shape. Translates directly to teaching hyperparameter sensitivity in ML (move learning rate, watch loss curve redraw), or teaching feedback loops in control systems. The shareable-scenario URL is a pattern Tessarix should copy verbatim — encode widget state in the URL so a lesson author can deep-link to a specific configuration.

  The 30-slider density is a high bar; most Tessarix widgets will use fewer knobs (3-7 is typical). But the principle scales: any number of input parameters connected to any number of derived visualisations, all redrawing on every change.
