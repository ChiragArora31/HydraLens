# HydraLens

HydraLens is a small retrieval lab I built while studying [HydraDB](https://hydradb.com/) and the [HydraDB paper](https://benchmarks.hydradb.com/HydraDB.pdf). It is not an implementation of HydraDB or an official HydraDB project. It is a focused, deterministic demo that makes one idea easy to see:

Semantic similarity is not enough for agent memory once facts can change over time.

A vector search system may retrieve both "I live in NYC" and "I moved to London" because both are relevant. A useful memory system also needs to answer what is true now, what was true then, when the state changed, why it changed, and which evidence supports the answer.

HydraLens turns that into an interactive comparison between three retrieval modes.

## Inspiration

This project is directly inspired by HydraDB's work on memory infrastructure for AI agents:

- [HydraDB website](https://hydradb.com/)
- [HydraDB paper](https://benchmarks.hydradb.com/HydraDB.pdf)

The paper's framing helped me think about agent memory less as a bag of semantically similar chunks and more as a versioned, queryable state system. HydraLens is my attempt to rebuild the smallest useful version of that mental model: raw memories become enriched chunks, enriched chunks connect to temporal graph edges, and answers are judged by whether they use the right state at the right time.

## What The Demo Shows

HydraLens runs the same query through three approaches:

1. **Naive flat retrieval**  
   Searches raw memory snippets with deterministic lexical overlap. It is intentionally simple, so the failure modes are visible.

2. **Enriched chunk retrieval**  
   Searches self-contained chunks that include resolved entities and latent signals. This helps with cases like "that framework" resolving to React.

3. **Temporal graph retrieval**  
   Reads append-only graph edges with `subject`, `relation`, `object`, `validFrom`, `validTo`, `commitTime`, `reason`, confidence, and source metadata. This lets the demo answer current-state, historical, causal, preference, multi-session, and abstention queries with an evidence path.

## Why It Exists

The interesting part of the HydraDB paper, to me, is the shift from "retrieve similar text" to "query versioned state."

HydraLens tries to make that concrete. The dataset is small enough to inspect by hand, but it still includes the kinds of questions that expose memory problems:

- "Where do I live now?"
- "Where did I live in 2022?"
- "Did I always dislike React?"
- "Why is Project Atlas blocked?"
- "What kind of tools should you recommend to me?"
- "What is my favorite coffee order?"

The last one matters too: a good memory system should know when to abstain.

## Dataset

The synthetic memory set contains 24 multi-session records and 23 temporal graph edges. It covers:

- a residence update from NYC to London
- framework preference changes across React, Vue, and Svelte
- a Project Atlas blocker chain across auth-service, user-db, migration-v2, and schema-change-ticket
- inferred tooling preferences around open source, self-hosting, cost control, and data sovereignty
- assistant-provided decision-log memory
- unsupported questions that should produce abstentions

The point is not to be a broad benchmark. The point is to make the shape of the failure easy to reason about.

## Run Locally

```bash
npm install
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

## Checks

```bash
npm run lint
npm test -- --run
npm run build
```

Or run everything together:

```bash
npm run check
```

## Project Structure

```text
src/App.tsx                 Product UI and comparison panels
src/App.css                 Application styling
src/data/hydraDataset.ts    Synthetic memory records, graph edges, and benchmark queries
src/lib/retrieval.ts        Deterministic retrieval, scoring, graph traversal, and evaluation
src/lib/retrieval.test.ts   Unit tests for the main retrieval behaviors
```

## Limitations

HydraLens uses deterministic scoring instead of real embeddings so the behavior is reproducible and easy to inspect. Query classification is rule-based for the same reason. The graph is deliberately small and bounded.

The next natural step would be to plug in real embeddings/BM25, add an ingestion pipeline that produces enriched chunks and temporal edges from raw sessions, and expose memory commits as editable diffs.
