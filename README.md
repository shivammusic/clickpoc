# Caido GraphQL INQL-Style Plugin Proposal

This repository now contains a runnable Caido plugin scaffold that mirrors the capabilities of the Burp INQL GraphQL scanner. The goal is to give Caido users a native way to enumerate GraphQL endpoints, perform introspection, map the schema, generate payloads, and replay or modify captured GraphQL traffic from inside Caido.

## Objectives
- Detect GraphQL endpoints and common parameter names (`/graphql`, `graph`, `query`, `mutation`).
- Run safe introspection to retrieve the schema when permitted.
- Build a searchable schema explorer showing types, fields, arguments, and directives.
- Generate example queries/mutations per field with parameter placeholders.
- Support dictionary-based discovery when introspection is disabled (wordlists for fields/types/operations).
- Highlight risky directives (e.g., `@deprecated`) and type patterns (e.g., admin boolean, password fields).
- Offer replay helpers to run crafted queries with custom headers or cookies.
- Export findings to JSON for downstream tools.

## Architecture
- **Traffic listener**: Hook into Caido’s proxy event stream to flag potential GraphQL requests (content-type, body shape, path heuristics).
- **Schema service**: Issues introspection queries, caches results, and normalizes them into a simplified model (`types`, `queries`, `mutations`, `inputs`).
- **Discovery engine**: When introspection fails, sends batched probe requests using a field/type wordlist, marking which operations return valid responses.
- **Generator**: Produces example operations per field, inserts placeholder variables, and lists likely argument types.
- **UI panel**: A dedicated view inside Caido with tabs for **Overview**, **Schema**, **Discovery**, and **Replay**. Includes search/filter and copy-to-clipboard buttons.

## Data flow
1. **Detection**: A request/response matching GraphQL heuristics triggers the plugin to ask whether to scan the target origin.
2. **Introspection**: If allowed, the plugin sends the standard `__schema` introspection query and parses the result into the schema cache.
3. **Exploration**: The UI presents types/fields; users can click to generate sample queries or mutations.
4. **Discovery fallback**: If introspection is blocked, the plugin launches batched probes using the wordlist and aggregates successes.
5. **Replay**: Users edit generated payloads and resend through Caido with captured cookies or custom headers.

## Suggested Caido plugin layout
```
caido-graphql-inql/
├─ package.json
├─ src/
│  ├─ index.ts          # Registers plugin, adds side panel, subscribes to proxy events
│  ├─ schema.ts         # Introspection query builder and parser
│  ├─ discovery.ts      # Wordlist-based probing logic
│  ├─ generator.ts      # Sample query/mutation builders
│  └─ ui/
│     ├─ App.tsx        # React/Svelte component for the panel
│     └─ components/
│        ├─ SchemaTree.tsx
│        ├─ QueryBuilder.tsx
│        └─ ReplayPane.tsx
└─ wordlists/
   ├─ fields.txt
   └─ types.txt
```

## Key implementation notes
- **Introspection query**: Use the standard condensed query to minimize payload size; throttle retries to avoid rate limits.
- **Schema parsing**: Normalize wrappers (`NON_NULL`, `LIST`) into a flat `typeString` (e.g., `[User!]!`). Cache by origin.
- **Safety**: Default to read-only operations; gate mutations behind an explicit toggle and add a prominent warning.
- **Heuristics**: Detect GraphQL by content-type `application/json`, presence of `query` or `operationName`, and response containing `errors` or `data` keys.
- **UI/UX**: Support filtering by type name, copying example payloads, and showing response previews for probes.
- **Extensibility**: Wordlists should be user-editable inside the plugin settings and stored per-workspace.

## Minimal TypeScript starter (pseudo-code)
```ts
import { registerPlugin, ui, proxy } from "@caido/sdk"; // Illustrative API
import { runIntrospection, parseSchema } from "./schema";
import { discoverFields } from "./discovery";
import { buildExample } from "./generator";

registerPlugin(async () => {
  const panel = ui.createPanel({ title: "GraphQL" });
  proxy.onRequest(async (event) => {
    if (!looksLikeGraphQL(event.request)) return;
    const origin = event.request.url.origin;
    const schema = await runIntrospection(origin, event.request.url.pathname);
    panel.render(App({ origin, schema, discoverFields, buildExample }));
  });
});
```

> Note: Replace the illustrative `@caido/sdk` calls with the actual Caido plugin API; the structure above is intended to guide implementation, not to be used verbatim.

## Next steps
1. Scaffold the plugin with Caido’s official plugin generator (or a minimal `package.json` with Caido SDK).
2. Implement the schema service with the standard introspection query and caching.
3. Build the discovery engine with configurable wordlists and batching.
4. Add the UI panels for Schema/Discovery/Replay with copy/send helpers.
5. Test against known GraphQL demo APIs (e.g., GitHub API, SWAPI clone) and targets where introspection is disabled.
```

This plan should provide a clear path to delivering an INQL-equivalent GraphQL scanner inside Caido.

## Implemented Caido plugin scaffold

The `caido-graphql-inql` directory now includes a minimal but functional plugin implementation that can be installed into Caido. Key capabilities:

- **Automatic detection**: Hooks into proxy traffic to identify GraphQL-looking requests and track them per origin.
- **Schema introspection**: Runs the condensed `__schema` query and renders query/mutation summaries in a panel.
- **Wordlist discovery**: Probes common field/type names when introspection is blocked. Default wordlists live in `wordlists/fields.txt` and `wordlists/types.txt` and can be edited before building the plugin.
- **Replay and modify**: Provides a textarea pre-filled with the last observed GraphQL body so you can edit and resend requests directly through Caido (handy for tampering or replay attacks).

### File map

- `caido-graphql-inql/src/index.ts` – registers the plugin, listens for proxy events, and renders the UI panel with introspection/discovery/replay controls.
- `caido-graphql-inql/src/schema.ts` – sends the introspection query and normalizes the returned schema.
- `caido-graphql-inql/src/discovery.ts` – probes GraphQL field/type names using the built-in wordlists.
- `caido-graphql-inql/src/generator.ts` – builds sample queries/mutations (available for expansion in the UI later).
- `caido-graphql-inql/wordlists/*.txt` – editable defaults for discovery payloads.
- `caido-graphql-inql/package.json` / `tsconfig.json` – build metadata and Caido manifest pointing at the compiled `dist/index.js` main entrypoint.

### Build and install

1. From `caido-graphql-inql`, install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
   The compiled plugin will be written to `caido-graphql-inql/dist`.
2. Zip the folder contents (including the `dist` output and `wordlists`) and load it into Caido via the plugin manager.
3. Open the **GraphQL INQL** panel inside Caido. As you browse traffic, GraphQL endpoints appear automatically. Use the **Introspect** or **Run discovery** buttons to map the schema, then edit and replay requests directly in the **Replay** section.

### Prebuilt bundle

To avoid GitHub’s "Binary files are not supported" banner, the repo ships the plugin as a text-safe base64 blob instead of committing the binary zip. You have two ways to obtain the ready-to-install archive:

1) **Decode locally (no download link required):**

```bash
# From the repo root
./scripts/decode-plugin.sh    # writes ./caido-graphql-inql.zip
```

Or run the underlying command manually:

```bash
base64 -d caido-graphql-inql.zip.b64 > caido-graphql-inql.zip
```

2) **Direct download via the raw base64 file:** Once this branch is on GitHub, grab the zip in one step using the raw file URL (replace placeholders with your repo). The generated archive now places the `package.json` manifest at the root of the zip (no extra folder), which Caido expects. If you previously saw "plugin manifest is bad," use the regenerated zip from this step:

```bash
curl -L "https://raw.githubusercontent.com/<USERNAME>/<REPO>/<BRANCH>/caido-graphql-inql.zip.b64" | base64 -d > caido-graphql-inql.zip
```

Then import `caido-graphql-inql.zip` in Caido’s plugin manager.

### Download to your Mac or push to your own repo

**Download the plugin to macOS**

1. Clone this repo (or download it as a zip):
   ```bash
   git clone <repo-url>
   cd clickpoc
   ```
2. Recreate the plugin zip locally (works on macOS out of the box):
   ```bash
   ./scripts/decode-plugin.sh  # writes ./caido-graphql-inql.zip
   ```
3. Load `caido-graphql-inql.zip` in Caido’s plugin manager.

If you prefer a one-liner without cloning the whole repo, fetch and decode the base64 archive directly:
```bash
curl -L "<raw-url-to>/caido-graphql-inql.zip.b64" | base64 -D > caido-graphql-inql.zip
```
Then import `caido-graphql-inql.zip` into Caido.

**Push your own fork**

1. Fork this repo, then add your fork as a remote:
   ```bash
   git remote add myfork git@github.com:<your-username>/<your-fork>.git
   ```
2. Push the code (including the plugin artifacts) to your fork:
   ```bash
   git push myfork main
   ```
3. From your fork, download `caido-graphql-inql.zip.b64` (raw) or decode it as above, then load the resulting zip into Caido.

### Drop this plugin into an existing repo (no new GitHub project required)

If you already have a repository and want to add this plugin to it, you can pull this code in as a branch and merge it locally:

```bash
# From your existing repo

# 1) Add this repository as a temporary remote.
git remote add caido-inql /workspace/clickpoc  # or git@github.com:USERNAME/clickpoc.git if hosted

# 2) Fetch the plugin branch (named "work" here).
git fetch caido-inql work

# 3) Create a branch in your repo that contains the plugin files.
git switch -c add-caido-inql
git merge caido-inql/work --allow-unrelated-histories

# 4) Keep everything at the repo root or move the plugin into a subfolder if you prefer:
mkdir -p tools && git mv caido-graphql-inql tools/
git commit -am "Move Caido GraphQL plugin under tools/"  # optional

# 5) Push your branch to your existing GitHub repo and open a PR there.
git push -u origin add-caido-inql
```

After merging, the `caido-graphql-inql.zip.b64` file will live in your repository, so you can download it directly from your repo’s file browser and decode it into the installable zip.

### Quick push-to-GitHub checklist (copy/paste friendly)

If you want to push the code to a new GitHub repository instead of a fork, use these one-liners:

```bash
# 1) Log in to GitHub and create an empty repo (no README/license) named "caido-graphql-inql".

# 2) Set the remote to your new repo. Replace USERNAME with your handle.
git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:USERNAME/caido-graphql-inql.git

# 3) Push the current branch (work) up to GitHub.
git push -u origin work

# 4) Verify the plugin zip is available from your repo:
git ls-remote --heads origin
# Then browse to https://github.com/USERNAME/caido-graphql-inql and download caido-graphql-inql.zip.b64, or pull it via:
# curl -L "https://raw.githubusercontent.com/USERNAME/caido-graphql-inql/work/caido-graphql-inql.zip.b64" | base64 -d > caido-graphql-inql.zip
```
