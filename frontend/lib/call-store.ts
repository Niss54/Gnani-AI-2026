import { CallRecord, CallResult } from "./types";

const calls = new Map<string, CallRecord>();
const byProviderId = new Map<string, string>();

export function createCallRecord(params: {
  invoiceId: string;
  debtorName: string;
  debtorPhone: string;
  mode: "live" | "demo";
  conversationId?: string;
  callSid?: string;
}): CallRecord {
  const id = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: CallRecord = {
    id,
    invoiceId: params.invoiceId,
    debtorName: params.debtorName,
    debtorPhone: params.debtorPhone,
    status: "calling",
    mode: params.mode,
    conversationId: params.conversationId,
    callSid: params.callSid,
    createdAt: now,
    updatedAt: now,
  };

  calls.set(id, record);
  if (params.conversationId) byProviderId.set(params.conversationId, id);
  if (params.callSid) byProviderId.set(params.callSid, id);

  return record;
}

export function getCallRecord(id: string): CallRecord | undefined {
  return calls.get(id);
}

export const getCall = (id: string) => getCallRecord(id);

export function getCallByProviderId(providerId: string): CallRecord | undefined {
  const id = byProviderId.get(providerId);
  return id ? calls.get(id) : undefined;
}

export function completeCallRecord(id: string, result: CallResult): CallRecord | undefined {
  const record = calls.get(id);
  if (!record) return undefined;

  record.status = "completed";
  record.result = result;
  record.updatedAt = new Date().toISOString();
  return record;
}
