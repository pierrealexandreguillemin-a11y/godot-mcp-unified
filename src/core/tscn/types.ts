/**
 * TSCN Type Definitions
 * ISO/IEC 25010 compliant - strict typing
 */

export interface TscnHeader {
  format: number;
  uidType: string;
  uid: string;
  loadSteps?: number;
}

export interface TscnExtResource {
  type: string;
  path: string;
  id: string;
  uid?: string;
}

export interface TscnSubResource {
  type: string;
  id: string;
  properties: Record<string, TscnValue>;
}

export interface TscnNode {
  name: string;
  type?: string;
  parent?: string;
  instance?: string;
  instancePlaceholder?: string;
  owner?: string;
  index?: number;
  groups?: string[];
  script?: string;
  properties: Record<string, TscnValue>;
}

export interface TscnConnection {
  signal: string;
  from: string;
  to: string;
  method: string;
  flags?: number;
  binds?: TscnValue[];
}

export interface TscnEditableInstance {
  path: string;
}

export type TscnPrimitive = string | number | boolean | null;
export type TscnValue = TscnPrimitive | TscnArray | TscnRecord | TscnFunctionCall;
export type TscnArray = TscnValue[];

export interface TscnRecord {
  [key: string]: TscnValue;
}

export interface TscnFunctionCall {
  name: string;
  args: TscnValue[];
}

export interface TscnDocument {
  header: TscnHeader;
  extResources: TscnExtResource[];
  subResources: TscnSubResource[];
  nodes: TscnNode[];
  connections: TscnConnection[];
  editableInstances: TscnEditableInstance[];
}

/**
 * Custom error class for TSCN parsing errors
 */
export class TscnParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TscnParseError';
  }
}
