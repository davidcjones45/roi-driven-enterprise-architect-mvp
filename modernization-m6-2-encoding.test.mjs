import test from 'node:test';
import assert from 'node:assert/strict';
import { providerCandidateAlternative, PROVIDERS } from './multicloud-modernization-adapter.mjs';

test('Azure candidate label uses encoding-safe separators', () => {
  const alt = providerCandidateAlternative({
    id:'AZ1',
    provider:PROVIDERS.AZURE,
    applicationId:'APP-1',
    strategy:'Replatform',
    targetDestination:'Azure App Service',
    confidence:.7
  });

  assert.equal(
    alt.name,
    'Microsoft Azure evidence candidate - Replatform -> Azure App Service'
  );
});

test('Google Cloud candidate label uses encoding-safe separators', () => {
  const alt = providerCandidateAlternative({
    id:'G1',
    provider:PROVIDERS.GCP,
    applicationId:'APP-1',
    strategy:'Replatform',
    targetDestination:'Google Cloud Run',
    confidence:.68
  });

  assert.equal(
    alt.name,
    'Google Cloud evidence candidate - Replatform -> Google Cloud Run'
  );
});
