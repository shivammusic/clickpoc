import { HttpClient } from "@caido/sdk";
export interface DiscoveryResult {
    discovered: Array<{
        operation: string;
        field: string;
        success: boolean;
    }>;
    errors: string[];
}
export declare function probeOperations(client: HttpClient, endpoint: string, headers: Record<string, string>, fieldWordlist?: string[], typeWordlist?: string[]): Promise<DiscoveryResult>;
