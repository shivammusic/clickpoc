import { registerPlugin } from "@caido/sdk";
import { fetchSchema } from "./schema";
import { probeOperations } from "./discovery";
const targets = new Map();
registerPlugin(async (context) => {
    const panel = context.ui.createPanel({ title: "GraphQL INQL" });
    context.events.onRequestFinished(async (event) => {
        if (!looksLikeGraphQL(event))
            return;
        const origin = extractOrigin(event.request.url);
        const record = targets.get(origin) ?? {
            endpoint: event.request.url,
            headers: filterHeaders(event.request.headers),
        };
        record.lastRequest = event.request;
        record.lastResponse = event.response;
        record.endpoint = event.request.url;
        targets.set(origin, record);
        render(panel);
    });
    globalThis.caidoGraphQLPlugin = createUiBridge(context, panel);
    render(panel);
});
function createUiBridge(context, panel) {
    return {
        async introspect(origin) {
            const record = targets.get(origin);
            if (!record)
                return;
            const result = await fetchSchema(context.http, record.endpoint, record.headers);
            record.schema = result.schema;
            record.schemaErrors = result.errors;
            targets.set(origin, record);
            render(panel);
        },
        async discover(origin) {
            const record = targets.get(origin);
            if (!record)
                return;
            record.discoveries = await probeOperations(context.http, record.endpoint, record.headers);
            targets.set(origin, record);
            render(panel);
        },
        async replay(origin, textareaId) {
            const record = targets.get(origin);
            if (!record)
                return;
            const textarea = document.getElementById(textareaId);
            const body = textarea?.value ?? "";
            const response = await context.http.send({
                method: "POST",
                url: record.endpoint,
                headers: {
                    "content-type": "application/json",
                    ...record.headers,
                },
                body,
            });
            context.ui.alert(`Replay status: ${response.status}`);
            render(panel);
        },
    };
}
function render(panel) {
    const sections = [];
    sections.push(`<style>${styles}</style>`);
    sections.push(`<h2>Tracked GraphQL Targets</h2>`);
    if (!targets.size) {
        sections.push(`<p class="muted">Browse traffic in the proxy; GraphQL-looking requests will appear here.</p>`);
    }
    for (const [origin, record] of targets.entries()) {
        sections.push(renderTarget(origin, record));
    }
    sections.push(renderScripts());
    panel.setContent(sections.join("\n"));
}
function renderTarget(origin, record) {
    const schemaSummary = record.schema
        ? `<details open><summary>Schema summary</summary>${renderSchema(record.schema)}</details>`
        : record.schemaErrors?.length
            ? `<div class="error">${record.schemaErrors.join("<br/>")}</div>`
            : `<p class="muted">No schema yet. Click Introspect to attempt __schema retrieval.</p>`;
    const discoveries = record.discoveries
        ? `<details open><summary>Discovery</summary>${renderDiscoveries(record.discoveries)}</details>`
        : `<p class="muted">Run discovery to probe common fields/types when introspection is blocked.</p>`;
    const lastBody = record.lastRequest?.body ?? JSON.stringify({ query: "{ __typename }" }, null, 2);
    const textareaId = `replay-${encodeURIComponent(origin)}`;
    return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="origin">${origin}</div>
          <div class="endpoint">${record.endpoint}</div>
        </div>
        <div class="actions">
          <button data-action="introspect" data-origin="${origin}">Introspect</button>
          <button data-action="discover" data-origin="${origin}">Run discovery</button>
        </div>
      </div>
      ${schemaSummary}
      ${discoveries}
      <details open>
        <summary>Replay / modify GraphQL request</summary>
        <p class="muted">Edit the payload then resend through Caido to see the live response in the proxy.</p>
        <textarea id="${textareaId}" rows="10">${escapeHtml(lastBody)}</textarea>
        <div class="actions">
          <button data-action="replay" data-origin="${origin}" data-target="${textareaId}">Send replay</button>
        </div>
      </details>
    </div>
  `;
}
function renderSchema(schema) {
    const queries = schema.queries
        .map((q) => `<li><code>${q.name}</code> (${q.args.join(", ")}) : <strong>${q.type}</strong></li>`)
        .join("");
    const mutations = schema.mutations
        .map((m) => `<li><code>${m.name}</code> (${m.args.join(", ")}) : <strong>${m.type}</strong></li>`)
        .join("");
    return `
    <div class="schema">
      <h4>Queries</h4>
      <ul>${queries || "<li class='muted'>None</li>"}</ul>
      <h4>Mutations</h4>
      <ul>${mutations || "<li class='muted'>None</li>"}</ul>
    </div>
  `;
}
function renderDiscoveries(result) {
    const rows = result.discovered
        .map((entry) => `<li class="${entry.success ? "success" : "muted"}">${entry.operation}: ${entry.field}</li>`)
        .join("");
    return `<ul>${rows || "<li class='muted'>No probes sent yet</li>"}</ul>`;
}
function renderScripts() {
    return `
    <script>
      (function(){
        const plugin = window.caidoGraphQLPlugin;
        document.querySelectorAll('[data-action="introspect"]').forEach((btn) => {
          btn.addEventListener('click', () => plugin.introspect(btn.dataset.origin));
        });
        document.querySelectorAll('[data-action="discover"]').forEach((btn) => {
          btn.addEventListener('click', () => plugin.discover(btn.dataset.origin));
        });
        document.querySelectorAll('[data-action="replay"]').forEach((btn) => {
          btn.addEventListener('click', () => plugin.replay(btn.dataset.origin, btn.dataset.target));
        });
      })();
    </script>
  `;
}
function looksLikeGraphQL(event) {
    const contentType = (event.request.headers["content-type"] || "").toLowerCase();
    if (contentType.includes("graphql"))
        return true;
    if (contentType.includes("application/json") && event.request.body?.includes("query"))
        return true;
    if (event.request.url.includes("graphql"))
        return true;
    const responseType = (event.response?.headers?.["content-type"] || "").toLowerCase();
    return responseType.includes("graphql") || responseType.includes("application/json");
}
function extractOrigin(url) {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
    }
    catch (err) {
        return url;
    }
}
function filterHeaders(headers) {
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === "content-length")
            continue;
        sanitized[key] = value;
    }
    return sanitized;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}
const styles = `
  .card { border: 1px solid #2e2e2e; padding: 12px; margin-bottom: 12px; border-radius: 6px; }
  .card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .actions button { margin-left: 8px; }
  .origin { font-weight: 700; }
  .endpoint { font-size: 12px; color: #999; }
  .muted { color: #888; }
  .error { color: #ff8a80; }
  textarea { width: 100%; font-family: monospace; }
  .success { color: #8bc34a; }
`;
