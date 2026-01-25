export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id?: string | number | null;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
  id: string | number | null;
}

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResponse {
  [key: string]: unknown;
  content: McpTextContent[];
  isError?: boolean;
}
