// Lazy import TopoJSON to reduce initial bundle size
export async function loadAuTopo(): Promise<Record<string, unknown>> {
  const topo = await import("../../assets/au-states.topo.json");
  // Return as generic object; react-simple-maps accepts object or URL
  return topo as unknown as Record<string, unknown>;
}
