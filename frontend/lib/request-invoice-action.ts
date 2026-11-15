import { getSupabase } from "./supabase";

export async function requestInvoiceAction(action: "notify" | "call" | "checkout", invoiceId: string) {
  const session = await getSupabase()?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("Sign in to act on an invoice.");
  const response = await fetch("/api/" + action, {
    method: "POST", headers: {Authorization: "Bearer " + token, "Content-Type": "application/json"},
    body: JSON.stringify({invoiceId, requestId: crypto.randomUUID()}),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || "Action could not be confirmed.");
  return data;
}
