import { CIF_REGISTRY } from './roi-ea-cif-registry.mjs';

// Import validates the registry at application startup; no domain records are changed.
const target = document.getElementById('cif-framework-version');
if (target) target.textContent = `CIF v${CIF_REGISTRY.framework_version} · EV-0: not independently externally validated.`;
