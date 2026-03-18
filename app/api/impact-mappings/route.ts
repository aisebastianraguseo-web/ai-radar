// Feature: business-impact-mapper
// Implemented by: feature-agent (Phase 4)
// Spec reference: Section 3 — Feature: business-impact-mapper

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Not implemented', code: 'NOT_IMPLEMENTED' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  })
}
