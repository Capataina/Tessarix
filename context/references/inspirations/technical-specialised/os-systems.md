# Operating Systems & Systems Programming

---

### Memory Tools (franrivalbigprojects)

- **URL**: https://franrivalbigprojects.github.io/memory-tools/
- **What it does**: Six distinct widgets: (1) Heap vs Stack Analyser — shows which data types go where; (2) Memory Alignment Checker — enter a struct, see padding bytes; (3) Memory Allocator Visualiser — simulate malloc/free strategies (first-fit, best-fit) and watch blocks allocate; (4) Fragmentation Simulator — trigger alloc/dealloc sequences, watch free space become non-contiguous; (5) Paging Simulator — trigger page faults, observe physical/virtual mapping; (6) Virtual Memory Visualiser — trace a virtual address through the page table to physical memory.
- **Interactive pattern**: Draw-and-simulate (pattern 10) + parameter sliders (pattern 7) + state-overlay (pattern 15) for before/after comparisons.
- **For Tessarix**: The fragmentation simulator's "cumulative side-effect of many small operations" pattern applies to teaching weight-space fragmentation, gradient accumulation, or buffer management in streaming systems. Six small focused widgets (vs one big general one) is also a structural lesson — keep widgets task-focused.

---

### Python Tutor

- **URL**: https://pythontutor.com/
- **What it does**: Paste Python, JavaScript, Java, C, or C++ code; click "Visualise Execution." The page renders the call stack, heap objects, and pointers as a live diagram that the user steps through forward and backward, one instruction at a time. Each step updates the frame diagram: new variables appear, objects are allocated on the heap, pointers are drawn as arrows.
- **Interactive pattern**: Step-by-step advance (pattern 9) with forward + backward — the strongest example of bidirectional stepping in the catalog + bidirectional highlight (pattern 3, code ↔ memory diagram).
- **For Tessarix**: The cleanest known "execution state as a diagram" widget. The forward+backward step is critical — letting the reader rewind without restart is what makes the interaction usable for understanding. Directly applicable to backprop-graph traversal, distributed message-passing, or any topic where reasoning requires inspecting intermediate state.
