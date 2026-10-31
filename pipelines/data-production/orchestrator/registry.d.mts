export interface ProductionRegistry {
  status: string;
  activation: { enabled: boolean };
  jobs: Array<{ execution_policy: { enabled: boolean; unattended: boolean }; implementation: { gate_reviewer_binding: string } }>;
}
export function loadRegistry(projectRoot: string, registryPath?: string): ProductionRegistry;
