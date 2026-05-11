# Machine Learning

The richest domain in the catalog for inspiration. ML pedagogy has been moving rapidly toward interactive form in the last 3–4 years; these are the state of the art.

---

### REINFORCEjs (Andrej Karpathy)

- **URL**: https://cs.stanford.edu/people/karpathy/reinforcejs/
- **What it does**: Four live browser demos: a gridworld solved with dynamic programming; a gridworld with tabular Q-learning and SARSA where the reader watches value functions update cell-by-cell; a PuckWorld demo with DQN in continuous state space; and WaterWorld. Adjust reward placement, learning rate, and discount factor live while training is running.
- **Interactive pattern**: Live model inference (pattern 14) + parameter sliders (pattern 7) + draw-and-simulate (pattern 10) — you edit the environment mid-training.
- **For Tessarix**: "Edit the reward function while training is running and watch the policy change" is one of the deepest RL teaching moments possible. The pattern of intervening in a live system is what makes RL click — Tessarix's RL lessons should aspire to this rather than showing pre-recorded training curves.

---

### Transformer Explainer (Polo Club, Georgia Tech)

- **URL**: https://poloclub.github.io/transformer-explainer/
- **What it does**: A live GPT-2 Small model runs in the browser via ONNX Runtime Web. The reader types any text prompt; every sub-computation updates in real time — embedding lookup, attention weight matrices (hoverable to highlight individual token attention), intermediate MLP activations, and final next-token probability distribution. Adjustable temperature and top-k/top-p sampling.
- **Interactive pattern**: Multi-level zoom with causal propagation (pattern 5) + bidirectional highlight (pattern 3) + live model inference (pattern 14) — three patterns composed.
- **For Tessarix**: The closest existing analogue to what a polished Tessarix ML lesson should be. A live model in-browser is now technically viable for small architectures (GPT-2 Small, small CNNs). "Zoom from architecture to operation" is the cleanest pattern for teaching how a high-level concept (attention) is implemented in concrete arithmetic. Tessarix's ML modules should have this zoom mechanic — likely M2 or M3 target.

---

### MLU-Explain (Amazon)

- **URL**: https://mlu-explain.github.io/
- **What it does**: Scrollytelling interactive articles on neural networks, linear/logistic regression, bias-variance trade-off, cross-validation, ROC/AUC, RL, random forests, double descent. The bias-variance article lets the reader drag a model-complexity slider and watch bias, variance, and total error curves update in real time as you scroll past it.
- **Interactive pattern**: Scroll-driven animation (pattern 2) + parameter sliders (pattern 7) embedded in prose.
- **For Tessarix**: Scrollytelling — where scrolling IS the interaction and the visualisation state is driven by scroll position — is a low-friction engagement pattern. The reader doesn't have to decide to interact; scrolling is the interaction. Strong fit for step-through algorithm lessons.

---

### Distill.pub — Feature Visualization / Circuits

- **URL**: https://distill.pub/2017/feature-visualization/ and https://distill.pub/2020/circuits/zoom-in/
- **What it does**: Research articles where figures are interactive. In the Circuits "Zoom In" article, clicking a neuron's feature visualisation reveals its weight connections to adjacent-layer neurons. In Building Blocks, spatial activation atlases are explorable by clicking and panning. Articles expose CNN internal representations as navigable, not static.
- **Interactive pattern**: Multi-level zoom (pattern 5) + in-prose widgets (cross-cutting).
- **For Tessarix**: Distill established that a peer-reviewed article can be interactive — the figure IS the argument, not an illustration of the argument. For Tessarix's ML Teach lessons, the visualisation of network internals should be the primary vehicle; prose serves as annotation, not the other way around.

---

### Gradient Boosting Explainer (Alex Rogozhnikov)

- **URL**: https://arogozhnikov.github.io/2016/06/24/gradient_boosting_explained.html
- **What it does**: An explanatory essay with two live interactive demos. The reader adjusts tree-depth and ensemble-size sliders; the demo shows the target function, the current ensemble's approximation, and the residuals that the next tree will fit. Watching residuals shrink as trees are added is the central conceptual insight.
- **Interactive pattern**: Parameter sliders (pattern 7) + state-overlay (pattern 15, target vs approximation vs residual).
- **For Tessarix**: Residuals-as-the-next-target is the key insight that makes gradient boosting click. The slider interaction lets you scrub through the learning process and see every stage. Generalised pattern: any algorithm with stages should be scrub-able, not just step-through-able. Move the slider, see the algorithm at that stage.
