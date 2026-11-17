# Learning and interface review

Current implementation: the comprehensive 46-chapter Linux/Bytewax course in the latest entry below supersedes earlier runtime and curriculum descriptions. Earlier entries are retained as review history.

## Applied skills

The UX and learning-design skills in `.agents/skills/` adapt the corresponding skills reviewed from PostgreSQL Lab. Applied before implementation and again to the rendered pages and actual experiments. This review was performed in one agent session; it is not an independent learner study.

## Design

PostgreSQL Lab supplies incident → prediction → executable evidence → change → transfer. Video Lab supplies short, local experiments with adjacent output; GPU Lab supplies independent explanatory state; Query Engine Book supplies the Python-worker architecture. A warm paper/forest/terracotta palette, serif headings, quiet metadata, and dark Python cells distinguish reading, execution and explanation. No mandatory prediction form interrupts running code.

Ten investigations progress through local processing, time, reliability, then the broker concepts that RxPY itself does not implement. The fixture is a five-order bicycle-shop example. All lessons are complete; none advertises unimplemented exercises. Each has goals, definitions, actual code, generated worked output, progressive hints, an independent transfer question, limitations and a primary source.

## Validation

`npm run check` executes the exact lesson snippets natively, generates their static worked results, then runs every snippet in real Chromium/Pyodide under the GitHub Pages project path. Browser outputs are compared structurally with native outputs. Model invariants check queue conservation and recovery effects. The broker examples assert partition-local offsets and independent cursor outputs.

Browser journeys cover runtime errors and retry, Stop of a nonterminating Python loop and runtime restart, stale-output notices, persisted drafts, explicit reversible reading marks, light/dark themes, and phone-width overflow. External browser requests are blocked during the suite: the runtime uses self-hosted assets. Desktop and phone screenshots were inspected. Changes from review include collapsible mobile navigation, ASCII-compatible directional glyphs, and retryable initialization failures. Reading marks do not grade knowledge or run success.

## Boundaries

This is a concepts course, with real local RxPY pipelines and separately labelled authored models. RxPY is not represented as a Kafka framework. No live broker, distributed checkpoints, transactions across systems, or exactly-once external effects are established. Virtual scheduler ticks and queue ticks are not performance measurements. The failure example is a deterministic receipt schedule, not a durable restart test. Kafka partitioning is explicit routing in a list model, not the real client's hash algorithm. Log retention, rebalance coordination and multiple-partition event-time progress are outside these bounded exercises.

Chromium is tested; Firefox and Safari are not yet verified. Runtime loading on slow connections and very large learner programs can exceed device limits. There is no service worker or complete offline installation. The worker is for UI responsiveness and cancellation, not a security boundary for hostile code. Source and run-record downloads are not broker checkpoints. See `about.html` for learner-facing limits.

## Advanced reading extension

Applied the same learning-design and UX skills to nine advanced non-lab chapters. Prerequisites link them to the executable foundations, then follow ownership → event-time progress → retained state → consistent snapshots → effects → pressure → redistribution → changing answers → operations. Every chapter has an observable goal, a specific failure/design situation, four-node conceptual map, authored trace table, transfer question, progressive hints, explanation, framework distinctions and official references.

The traces are authored worked cases, not captured executions. Checkpoint C consistently includes the pre-barrier a (£12) and b (£8), excludes post-barrier c (£5), and distinguishes the snapshot cut from coordinator completion. The fixed-rate example conserves offered minus completed work and labels its arithmetic assumptions. Multiple-input watermark examples state active-input and boundary conventions, rather than promising identical framework trigger boundaries. Retention, rescaling and sink guarantees remain contract-specific. JavaScript-free browser checks read every chapter without any engine or wheel requests. Browser checks cover chapter marks, answer disclosures, every advanced page at 390px, desktop/mobile screenshots and internal paths.

The ZeroMQ PDF was downloaded and its title, publication date, contents and license read: Pieter Hintjens, Code Connected Volume 1: Learning ZeroMQ, Professional Edition for C/C++, first printing January 6, 2013, CC BY-SA 3.0. The companion page links it, describes the messaging-pattern complement and proposes original native PyZMQ exercises; no book chapters/examples are reproduced. Browser TCP limitations, bridge architecture and the absence of any verified browser ZeroMQ runtime are explicit. The proposed companion is separate from the implemented advanced reading path.

## License visibility review — 12 November 2026

Applied the local UX and learning-design skills before and after this footer-only change. Readers can identify the prose and code licenses from every course page and follow descriptive links to the existing terms. The footer uses the shared shell, including advanced readings; it adds no runtime download or action to the lesson sequence. Existing licenses, teaching text, examples, state controls and third-party notices are unchanged.

Validation: `npm run check` passed, including all ten native/Pyodide comparisons, error/retry, Stop/restart, drafts, reading marks, themes, mobile layouts and the advanced reading path. Separate Chromium checks and inspected screenshots at 390px and 1440px confirmed visible license links on the overview and a lesson, with no horizontal overflow.

## Comprehensive six-part revision

Applied both repository skills before expanding and after inspecting outputs. The authoritative catalog now interleaves 21 executed investigations and nine distributed readings across six parts, with previous/next prerequisites spanning both page types. Existing URLs, draft keys and completion keys remain unchanged. The homepage no longer presents the resource as a two-hour course; it exposes the six parts and their learning outcomes instead.

Added inspectable schema/version rejection, retention/compaction, causal event/processing clock observations, session bridging, correction/cleanup, join multiplicity, valid-time lookup, instrumented effort, batching latency, recovery capacity and a cumulative incident investigation. Under-the-hood accounts accompany all executable chapters. Inspected the installed pinned RxPY code: distinct's class named HashSet uses a comparer over a list; group_by_until uses OrderedDict. Claims distinguish those implementations from expected hash-based abstract bounds. Trace-copy overhead is disclosed.

New semantic checks use independent expected results and policy variations, not only browser/native agreement. They include session gaps, zero/nonzero allowed lateness, output multiplicity, linear comparison counts, causal clock ordering, a batching-throughput improvement with worse latency, nonpositive recovery headroom and the capstone's divergent policies. A real local native harness executes both backends and verifies answers; it does not present modeled milliseconds as measured runtime or claim a tested Kafka/Flink topology.

The capstone asks for exported run evidence, a first-divergence diagnosis, rejected-record accounting, state/cost implications and a repaired policy with independent edge cases. Its worked answer does not claim the local model establishes distributed recovery. The ZeroMQ proposal is unchanged and remains separate.


## Linux / Bytewax migration — 17 November 2026

Applied the local UX and learning-design skills before implementing the migration. The intended next action stays Run beside editable code. Preserve the complete curriculum, under-the-hood accounts, independent transfer tasks and static reading. Identify actual operators, reference policies and broker simulation distinctly; make the larger runtime’s load/reset contract visible before activation. Preserve existing URLs/reading marks and archive earlier drafts rather than executing incompatible RxPY source silently.

The course now has 31 chapters (22 executable investigations plus nine readings). A new live Kafka lesson proves four arrivals occur after a separate engine process has emitted an earlier result. Real Bytewax graphs replace the RxPY operators, window/session helpers and capstone state machine. Partition reads use Bytewax KafkaSource; group positions use real Kafka commit/fetch requests. The broker remains explicitly an in-memory librdkafka simulator. The controlled recovery drill observes a completed checkpoint, sends SIGKILL, and restores source position 3 and state 25 in a new process. Ordinary sink output and volatile guest files do not establish end-to-end exactly-once effects or browser-close recovery.

The JSLinux spike established feasibility. The shipped VM instead uses the open container2wasm/Bochs distribution so it can be self-hosted with documented provenance. A pinned official Python/Debian image supplies CPython 3.12.16 and matching libraries, avoiding the spike’s old glibc workaround. Packaging checks retain loader SONAME aliases: resolving symlinks to versioned filenames caused a real failed browser run and was fixed. The original guest’s loopback interface is down without NET_ADMIN; a real Chromium test verified private user/network namespaces and loopback-only setup, which is now performed by the runner. No host relay or external execution service is used.

Initial assets total 83.45 MiB after JavaScript-side gzip decompression replaced the 171 MiB raw transfer. There is no guest archive extraction or guest package install. The worker verifies transferred bytes, reports progress and instantiates a fresh VM for each run. Stop destroys the worker/guest, while editor drafts and reading marks remain. Existing drafts are archived under legacy-draft keys and offered for download. Source downloads embed all helper modules; result exports record actual framework/runtime identity. Runtime/package notices, exact hashes and the upstream source/build recipe are published with the site.

Validation: `npm run check` passed. All 22 exact editor sources executed inside Chromium/Linux and matched independently asserted native results. The suite passed actual Kafka partition/group reads and live arrivals, Bytewax event-time windows/sessions, keyed identity state, SIGKILL recovery, the capstone and all reference policies. Python error/retry, Stop/restart, standalone Python download execution, source/result export, stale-output notices, legacy-draft preservation, reading marks, themes, phone-width layouts, project-subpath assets and all nine JavaScript-free advanced readings passed. External browser requests were blocked. Separate rendered-page checks confirmed keyboard focus proceeds from editor to Run, no phone-width overflow, and no VM requests before activation. Desktop and phone screenshots were inspected; the runtime banner, simulator label, reset contract, code and adjacent output remain readable. Prose review corrected stale scheduler/session terminology and pins Bytewax source links to v0.21.1. A formatting check verified all 22 code strings remained unchanged. The review is one agent’s implementation review, not a learner study.

## Comprehensive pattern and production expansion — 17 November 2026

Reapplied both local skills to the completeness review, implementation and rendered pages. The authoritative course now interleaves 30 executable investigations and 16 substantial readings across eight parts. The original time, late-data, recovery and performance sequence remains intact. Eight new real-engine pattern investigations cover routing/quarantine, fan-out/re-keying, materialized views, actual keyed-state deletion, ordered sequence detection, bounded retry policy, bounded Kafka replay and changing-stream joins. Seven new readings connect architecture choices, stream/table semantics, sequence/absence, CDC/outbox/inbox, release/testing, security/governance and a complete design playbook. See `docs/completeness-review.md` for the baseline gap matrix and remaining real-deployment exercises.

Every new investigation includes inspectable fixture data, predictions, actual generated output, a meaningful policy change, progressive hints, independent transfer, primary sources and work/state/movement/progress/recovery accounts. Boundaries distinguish actual Bytewax APIs from authored retry schedules, expiry controls, ordered fixtures and local upserts. EOF-emitting joins/aggregations are identified; they do not imply a live result trigger. The expanded design assessment asks for a topology, identity and clock contracts, consistency cuts, budgets, failure cases and evidence instead of grading Run completion.

The first migration passed all 22 browser examples locally, but GitHub Actions stalled in a later guest and blocked publication. The WASI polling shim now respects clock deadlines and treats idle nonblocking stdin as pending rather than EOF. Boot initialization has a 60-second watchdog and one bounded retry before Python starts. Learner source is never automatically retried; exports record initialization retry counts. Stop and navigation invalidate pending callbacks. Browser evidence now captures status/output/screenshots on execution failures. A controlled stalled-worker test verifies that Stop cancels the watchdog and that one failed initialization recovers into actual Linux execution with a matching native answer.

Native validation passes all 30 exact editor sources and independent policy/boundary variants, including fan-out totals, stale tombstones, identity expiry, sequence horizons, retry budgets, bounded replay and join multiplicity. Static Chromium inspection reads all 16 chapters without JavaScript and finds no phone-width overflow; the shortest main text is 3,832 characters. Desktop and phone renders were inspected. A long navigation menu originally pushed JavaScript-free mobile reading far down the page; it now scrolls within a bounded area. Keyboard focus moves from the editor to Run. New pattern chapters also expose the exact helper function inline, so the real operator graph and authored callback policy can be inspected without leaving the reading path. Primary-source review replaced obsolete Kafka redirect/concepts URLs with direct official versioned pages. The paper/forest palette, serif hierarchy, adjacent code/output, runtime/reset notice and explicit simulator labels remain consistent.

The full expanded browser suite is required by the [check and publish workflow](https://github.com/snowch/event-streaming-lab/actions/workflows/pages.yml), which retains browser evidence and blocks deployment on failure. An environment restart interrupted the first expanded run after three successful lessons; it was restarted rather than counted as a pass. The repeat run passed the earlier stalled temporal lookup, actual SIGKILL recovery and all time/window investigations. Final release evidence is the workflow result and its browser-evidence artifact. This review remains one agent's implementation review, not an independent learner study.


## GPU Lab v2 visual alignment — 17 November 2026

The user requested the style of https://snowch.github.io/gpu-lab/v2/first-kernel.html. Reapplied the repository UX and learning-design skills, read the rendered reference and its CSS, and inspected desktop/phone screenshots. Match the centered chapter measure, IBM Plex Sans/Mono typography, cool light surface, green tasks, dark workbench, breadcrumb course switcher and previous/next chapter cards. The pinned reference release is `7c64ab99933d578f7a17db931417f664223ba8c1750cabe56860851a2bc459e7`. Font files are unchanged, self-hosted with their OFL notices and byte hashes.

Course content, URLs, editor IDs, draft/reading keys and Linux execution semantics are preserved. Native details navigation remains usable without JavaScript; enhancement adds a bounded overlay, outside-click dismissal and Escape returning focus to its summary. The console stays with the editor inside one workbench. Runtime identity, the simulator boundary, download size and fresh-guest/Stop contract stay visible.

The interface check verifies centered chapters, the actual loaded font family, keyboard selection, outside/Escape closure, all 46 chapter links, light/dark state, all 51 pages at phone width without JavaScript, inspectable operator source and no runtime requests before activation. It found an overflowing long example expression after the font change; paragraph wrapping was corrected. The full 30-example Linux suite and interaction journeys passed before this presentation change; the release workflow repeats full execution before publishing. Screenshots are implementation review evidence, not a learner study.

The expanded 30-investigation runtime also passed the complete GitHub Actions Linux gate before the visual revision. To keep that coverage practical, the publication workflow now builds/validates once and executes the same investigations across four independent Linux/browser jobs, with all interaction/recovery journeys on the first job. Each job has isolated evidence paths; deployment needs every job. Pull requests run native, build/link and complete interface checks; publication additionally requires all actual Linux runs. The local `npm run check` retains the full sequential gate.


## Exercise-density review — 17 November 2026

A user screenshot showed that the old practice structure remained visually repetitive after the typography revision: a generic transfer paragraph, large section gaps and four equal disclosure rows. Applied both local skills to replace it with one compact question card, a grouped progressive-hints control, a separate explanation reveal and a quieter scope note. Removed the repeated generic cost-transfer paragraph while retaining all five operation accounts and the independent transfer task. UI revision queries keep the CSS and module current for returning readers. The same exercise component is used by Messaging Patterns Lab.

The startup-fault test now isolates bounded host retry/Stop behavior without fabricating any result, then runs the real source with a fresh initialization budget. Combining an injected failed attempt with a cold VM boot had consumed the retry allowance and produced an inconclusive stopped boot. Real learner code remains never automatically retried.

## Editable clock and join examples, run and draft recovery — 17 November 2026

Applied the learning-design and UX skills to the two editable experiments and
the shared workbench. The next action is visible with optional sections closed.
In Choose the right clock, the editor supplies processing times, and the
instructions point to order `c` and its time and window fields. A change from
13 to 9 seconds moves `processing_window` from 1 to 0. Order `c` keeps event
time 8 and `event_window` 0. The trace keeps the same display order. In Count
the join output, widening the time bound adds the existing receipt `p3` while
the comparison count stays at six. Adding `p4` makes four matches and eight
comparisons. Both are authored models. The Bytewax and Kafka simulator
boundaries remain visible where those systems are used.

The workbench presents execution errors separately from the last successful
console and trace. Export run keeps that successful source and output. Run and
Stop return keyboard focus to the next available control, and download progress
appears while a measured total is available. Restore code keeps the most
recently replaced draft, including across reloads when storage is available.
Recovered code opens from the beginning of the file. Earlier RxPY migration
downloads remain available separately. Technical detail uses the same readable
palette as successful console output in both themes.

`npm run check:core` passed all 30 native examples, the new variants, both
native performance backends, catalogue and WASI checks, and static/interface
checks across 51 pages. An independent Chromium walkthrough ran the original
clock and join examples and all stated edits in actual browser Linux. It
verified Run and Stop focus, retained console and trace after a Python error,
an unchanged run JSON export, and draft recovery after reload at phone width.
Restoring and recovering the beginning of the source was checked at 320px,
390px and 1440px.
The publication workflow runs the complete Linux browser matrix.

These checks address instructions, execution and interaction. No learner study
measured understanding or transfer.


## Explanatory diagrams

Added semantic HTML/SVG diagrams before 22 lab investigations. Operator flows, event-time window membership, join multiplicity, state cleanup and recovery paths use distinct layouts. Parallel partitions/readers/keyed histories and accepted-versus-late outputs use branch diagrams, so arrows do not imply a false serial pipeline. Every figure is labelled conceptual and describes the starter/example boundary; actual execution evidence remains in the console and run exports. Reading and diagrams require no JavaScript or runtime download. Phone checks cover each figure’s containing page and figures remain selectable/readable text.

The browser completion check now waits for Run to become available again. A status containing “startup stalled · retrying” is a nonterminal initialization state and must not be mistaken for a failed program. Source execution is still never automatically retried.

## Run latency review — 17 November 2026

The shared bottleneck was a full x86 Linux/Python startup on every Run. Preserve that fresh-guest contract, while removing eager runner imports, using the explicit import path with Python `-S`, disabling WASI pathname debug logging, indexing the bundle once and sharing only immutable archive bytes. IndexedDB stores verified prepared asset bytes across chapters, keyed by every manifest asset's filename/hash/size. Large binary blobs avoid Chromium’s serialized-record size limit, verified with the full-sized runtime across chapter navigation. It never stores the editor, guest memory or results. Unsupported/denied/quota-limited storage is optional and falls back to normal downloads. Helpers still load freshly. A compiled WebAssembly module cannot be stored in Chromium IndexedDB; this cache deliberately stores bytes instead.

An exploratory memory/Asyncify startup snapshot did not resume correctly with the pinned VM; it was not included. The shipped path still creates a new WebAssembly instance and Linux guest for every source execution. Stop and the one pre-Python boot retry retain their existing semantics.

Before/after local Chromium checks ran the exact first published source three times per course, with both courses active concurrently. The two repeat runs had median totals of 23.55 → 20.14 seconds for streaming and 19.07 → 16.10 seconds for messaging (about 14–16% less time). This small desktop sample is illustrative, not a mobile, network or production benchmark. The measured totals, phase boundaries and method are recorded in [runtime-startup-check.json](runtime-startup-check.json); full records are retained in the workspace runtime-baseline.json and runtime-optimized.json. The completion status and exports now expose measured time.

Validation covers native examples, all real browser investigations, cache persistence across chapter navigation, manifest mismatch and storage denial, Stop/errors/draft behavior, and repeated code that asserts prior Python globals and a /tmp marker do not exist. Static reading and phone layouts remain available without runtime loading.

## Compact course entry — 17 November 2026

Apply Messaging Patterns Lab’s compact entry to Event Streaming Lab: a short practical introduction, one starting action, lesson/prerequisite counts and a numbered chapter list. Remove the introductory illustration, repeated slogans and large card grid from the home page. Runtime details remain in Field notes and beside Run; the diagrams and traces in individual lessons remain available. Part summaries use concrete actions.

All 46 chapters retain their existing order, destinations and explicit read marks, with Lab/Reading labels. Home-page styles are scoped so lesson/editor layouts retain their current design. Review the opening screen at 390px and 834px, desktop and dark mode, keyboard navigation, saved read marks, static reading without runtime downloads, and every existing phone layout. Native examples, links and interface checks run before merging; the publication workflow gates deployment on the complete browser Linux matrix.
