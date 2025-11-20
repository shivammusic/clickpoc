import { HttpClient } from "@caido/sdk";

export interface IntrospectionResponse {
  data?: { __schema?: IntrospectionSchema };
  errors?: Array<{ message: string }>;
}

export interface IntrospectionSchema {
  types: IntrospectionType[];
  queryType?: { name: string };
  mutationType?: { name: string };
}

export interface IntrospectionType {
  kind: string;
  name: string;
  description?: string;
  fields?: Array<{
    name: string;
    args: Array<{ name: string; type: IntrospectionTypeRef }>;
    type: IntrospectionTypeRef;
  }>;
  inputFields?: Array<{
    name: string;
    type: IntrospectionTypeRef;
  }>;
}

export interface IntrospectionTypeRef {
  kind: string;
  name?: string;
  ofType?: IntrospectionTypeRef;
}

export interface SchemaSummary {
  queries: Array<{ name: string; type: string; args: string[] }>;
  mutations: Array<{ name: string; type: string; args: string[] }>;
  types: string[];
}

export const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          args { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }
          type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
        }
        inputFields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }
      }
    }
  }
`;

export async function fetchSchema(
  client: HttpClient,
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<{ schema?: SchemaSummary; errors?: string[] }> {
  const response = await client.send({
    method: "POST",
    url: endpoint,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });

  if (response.status >= 400) {
    return { errors: [`Introspection responded with status ${response.status}`] };
  }

  const payload: IntrospectionResponse = safeJson(response.body);
  if (payload.errors?.length) {
    return { errors: payload.errors.map((e) => e.message) };
  }

  const schema = payload.data?.__schema;
  if (!schema) {
    return { errors: ["No __schema field returned"] };
  }

  return { schema: normalizeSchema(schema) };
}

function safeJson(body?: string): any {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (err) {
    return {};
  }
}

export function normalizeTypeName(ref?: IntrospectionTypeRef): string {
  if (!ref) return "Unknown";
  if (ref.kind === "NON_NULL") return `${normalizeTypeName(ref.ofType)}!`;
  if (ref.kind === "LIST") return `[${normalizeTypeName(ref.ofType)}]`;
  return ref.name ?? "Unknown";
}

function normalizeSchema(schema: IntrospectionSchema): SchemaSummary {
  const queries: Array<{ name: string; type: string; args: string[] }> = [];
  const mutations: Array<{ name: string; type: string; args: string[] }> = [];
  const types = new Set<string>();

  schema.types.forEach((type) => {
    if (type.name?.startsWith("__")) return;
    types.add(type.name);

    if (
      schema.queryType?.name === type.name ||
      schema.mutationType?.name === type.name
    ) {
      type.fields?.forEach((field) => {
        const entry = {
          name: field.name,
          type: normalizeTypeName(field.type),
          args: field.args.map(
            (arg) => `${arg.name}: ${normalizeTypeName(arg.type)}`
          ),
        };
        if (schema.mutationType?.name === type.name) {
          mutations.push(entry);
        } else {
          queries.push(entry);
        }
      });
    }
  });

  return { queries, mutations, types: Array.from(types).sort() };
}
