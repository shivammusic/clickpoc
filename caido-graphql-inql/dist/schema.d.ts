import { HttpClient } from "@caido/sdk";
export interface IntrospectionResponse {
    data?: {
        __schema?: IntrospectionSchema;
    };
    errors?: Array<{
        message: string;
    }>;
}
export interface IntrospectionSchema {
    types: IntrospectionType[];
    queryType?: {
        name: string;
    };
    mutationType?: {
        name: string;
    };
}
export interface IntrospectionType {
    kind: string;
    name: string;
    description?: string;
    fields?: Array<{
        name: string;
        args: Array<{
            name: string;
            type: IntrospectionTypeRef;
        }>;
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
    queries: Array<{
        name: string;
        type: string;
        args: string[];
    }>;
    mutations: Array<{
        name: string;
        type: string;
        args: string[];
    }>;
    types: string[];
}
export declare const INTROSPECTION_QUERY = "\n  query IntrospectionQuery {\n    __schema {\n      queryType { name }\n      mutationType { name }\n      types {\n        kind\n        name\n        description\n        fields(includeDeprecated: true) {\n          name\n          args { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }\n          type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }\n        }\n        inputFields { name type { kind name ofType { kind name ofType { kind name ofType { kind name } } } } }\n      }\n    }\n  }\n";
export declare function fetchSchema(client: HttpClient, endpoint: string, headers?: Record<string, string>): Promise<{
    schema?: SchemaSummary;
    errors?: string[];
}>;
export declare function normalizeTypeName(ref?: IntrospectionTypeRef): string;
