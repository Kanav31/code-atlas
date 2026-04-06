import { Callout } from '@/components/visualizer/shared/Callout';

export function SimDisclaimer() {
  return (
    <Callout type="info" title="Simulated:">
      Latency and payload figures are illustrative ranges based on real-world benchmarks, not live
      network measurements. Actual values vary by geography, server load, and client hardware.
    </Callout>
  );
}
