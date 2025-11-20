import { HttpClient } from "@caido/sdk";

export interface DiscoveryResult {
  discovered: Array<{ operation: string; field: string; success: boolean }>;
  errors: string[];
}

const DEFAULT_FIELDS = [
  "id",
  "email",
  "username",
  "password",
  "admin",
  "viewer",
  "user",
  "users",
  "me",
  "profile",
  "node",
  "nodes",
  "createUser",
  "login",
  "updateUser",
  "deleteUser",
  "search",
  "list",
];

const DEFAULT_TYPES = [
  "User",
  "Admin",
  "Account",
  "Session",
  "Token",
  "Query",
  "Mutation",
  "Profile",
  "Node",
];

export async function probeOperations(
  client: HttpClient,
  endpoint: string,
  headers: Record<string, string>,
  fieldWordlist: string[] = DEFAULT_FIELDS,
  typeWordlist: string[] = DEFAULT_TYPES
): Promise<DiscoveryResult> {
  const discovered: DiscoveryResult["discovered"] = [];
  const errors: string[] = [];

  for (const typeName of typeWordlist) {
    const fragment = `{ __typename ${typeName !== "Query" ? "... on " + typeName + " { __typename }" : ""} }`;
    const payload = { query: `query Probe{${fragment}}` };
    const result = await sendProbe(client, endpoint, headers, payload);
    discovered.push({ operation: "type", field: typeName, success: result });
  }

  for (const fieldName of fieldWordlist) {
    const payload = { query: `query Probe{ ${fieldName} { __typename } }` };
    const result = await sendProbe(client, endpoint, headers, payload);
    discovered.push({ operation: "field", field: fieldName, success: result });
  }

  return { discovered, errors };
}

async function sendProbe(
  client: HttpClient,
  endpoint: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    const response = await client.send({
      method: "POST",
      url: endpoint,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (response.status >= 400) return false;
    const json = safeJson(response.body);
    if (json.errors && Array.isArray(json.errors)) {
      return json.errors.some((e: any) => typeof e.message === "string" && e.message.includes("Cannot query"))
        ? false
        : true;
    }
    return Boolean(json.data);
  } catch (err) {
    return false;
  }
}

function safeJson(body?: string): any {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (err) {
    return {};
  }
}
