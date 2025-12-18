const BASE_URL = "https://services.leadconnectorhq.com";

type ContactPayload = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { message?: string }) : ({} as T);

  if (!response.ok) {
    const message = (data as { message?: string }).message ?? `GHL request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function buildHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Version: "2021-07-28",
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;
}

export async function searchContacts(accessToken: string, locationId: string, query: string) {
  const params = new URLSearchParams({ locationId, query });
  const response = await fetch(`${BASE_URL}/contacts/search?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  return handleResponse<{ contacts: Array<{ id: string }> }>(response);
}

export async function createContact(
  accessToken: string,
  locationId: string,
  data: { firstName?: string; lastName?: string; email?: string | null; phone?: string | null },
) {
  const response = await fetch(`${BASE_URL}/contacts/`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ locationId, ...data }),
  });

  return handleResponse<{ contact: { id: string } }>(response);
}

export async function updateContact(accessToken: string, contactId: string, data: ContactPayload) {
  const response = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    headers: buildHeaders(accessToken),
    body: JSON.stringify(data),
  });

  return handleResponse<{ contact: { id: string } }>(response);
}

export async function updateContactCustomField(
  accessToken: string,
  contactId: string,
  fieldId: string,
  value: unknown,
) {
  const response = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: "PUT",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ customFields: [{ id: fieldId, value }] }),
  });

  return handleResponse<{ contact: { id: string } }>(response);
}

export async function addContactNote(accessToken: string, contactId: string, body: string) {
  const response = await fetch(`${BASE_URL}/contacts/${contactId}/notes`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ body }),
  });

  return handleResponse<{ note: { id: string } }>(response);
}

export async function addContactTag(accessToken: string, contactId: string, tags: string[]) {
  const response = await fetch(`${BASE_URL}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ tags }),
  });

  return handleResponse<{ message: string }>(response);
}

export async function deleteContact(accessToken: string, contactId: string) {
  const response = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: "DELETE",
    headers: buildHeaders(accessToken),
  });

  return handleResponse<{ success: boolean }>(response);
}
