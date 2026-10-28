export type DeploymentStatus = 'pending' | 'live' | 'unconfirmed';

export async function contentDigest(content: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(content, null, 2) + '\n');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Verify the public artifact, not the owner's local preview or repository HEAD.
export async function isDeployed(revision: string, contentHash: string, signal: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}version.json?v=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
  const version = await response.json();
  return version.revision === revision || version.contentHash === contentHash;
}
