// Minimal Caido SDK surface used by this plugin for type-checking purposes only.
// Adjust to match the runtime SDK when building inside Caido.
declare module "@caido/sdk" {
  export interface HttpRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }

  export interface HttpResponse {
    status: number;
    headers: Record<string, string>;
    body?: string;
  }

  export interface ProxyEvent {
    request: HttpRequest;
    response?: HttpResponse;
    id: string;
  }

  export interface HttpClient {
    send(request: HttpRequest): Promise<HttpResponse>;
  }

  export interface StorageAPI {
    get<T>(key: string, fallback: T): Promise<T>;
    set<T>(key: string, value: T): Promise<void>;
  }

  export interface Panel {
    setContent(content: string): void;
    on(event: "refresh", handler: () => void): void;
  }

  export interface UIAPI {
    createPanel(options: { title: string; icon?: string }): Panel;
    alert(message: string): void;
  }

  export interface EventsAPI {
    onRequestFinished(handler: (event: ProxyEvent) => void): void;
  }

  export interface PluginContext {
    http: HttpClient;
    ui: UIAPI;
    events: EventsAPI;
    storage: StorageAPI;
    logger: { info(message: string): void; error(message: string): void };
  }

  export function registerPlugin(
    init: (context: PluginContext) => Promise<void> | void
  ): void;
}
