import { importBpmnXml } from './bpmn-parser-adapter.mjs';
import { validateBpmnStructure } from './bpmn-structural-validator.mjs';

/**
 * G2's single supported intake path. It returns a browser-local staged or
 * rejected import model and never writes to the canonical FEOA workspace.
 */
export async function parseAndValidateBpmn(input) {
  return validateBpmnStructure(await importBpmnXml(input));
}
