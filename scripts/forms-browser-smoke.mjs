import path from 'node:path';
import os from 'node:os';
const {chromium}=await import(process.env.FAC_PLAYWRIGHT_MODULE || 'playwright');
const artifactDir=process.env.FAC_TEST_ARTIFACTS || path.join(os.tmpdir(),'roi-ea-forms-browser');
await fs.mkdir(artifactDir,{recursive:true});
const baseUrl=process.env.FAC_BASE_URL || 'http://127.0.0.1:8878';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({...(process.env.FAC_BROWSER_EXECUTABLE?{executablePath:process.env.FAC_BROWSER_EXECUTABLE}:{}),headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));let acceptDialog=true;page.on('dialog',d=>acceptDialog?d.accept():d.dismiss());
const click=(action)=>page.locator(`#forms [data-fac="${action}"]`).click();
const stage=name=>page.locator(`#forms [data-stage="${name}"]`).click();
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('roi-ea-forms-analysis-v1')));
const form=kind=>page.locator(`#forms [data-fac-form="${kind}"]`);
try{
await page.goto(`${baseUrl}/index.html`,{waitUntil:'networkidle'});
await page.locator('[data-workspace-select="forms"]').click();
assert.match(await page.locator('#forms').innerText(),/No forms yet/);
await click('new');await form('create').getByLabel('Form name',{exact:true}).fill('Service intake');await form('create').getByLabel('Owner',{exact:true}).fill('Test owner');await form('create').getByLabel('Paste field labels (optional)',{exact:true}).fill('# Customer\nAccount\nEmail');await form('create').getByRole('button',{name:'Create form',exact:true}).click();
let data=await read();assert.equal(data.forms.length,1);assert.equal(data.forms[0].fields.length,2);
assert.equal(await page.locator('#forms [data-stage="Analyze"]').isDisabled(),true);
await page.locator('#forms .fac-structure').getByRole('button',{name:'Account',exact:true}).click();
await form('field').getByLabel('Field label',{exact:true}).fill('Customer account');
await form('field').getByLabel('Can be prefilled',{exact:true}).selectOption('Yes');
await form('field').getByLabel('Purpose / why collected',{exact:true}).fill('Match the customer');
await form('field').getByLabel('Source system',{exact:true}).fill('CRM');
await form('field').getByRole('button',{name:'Save field',exact:true}).click();
await form('verify').getByLabel('Reviewer name',{exact:true}).fill('Reviewer One');await form('verify').getByRole('checkbox').check();await form('verify').getByRole('button').click();
await click('scan');assert.match(await page.locator('#forms').innerText(),/No decisions were made/);await stage('Recommend');
const article=page.locator('#forms article').filter({has:page.getByRole('heading',{name:/^Prefill/})});
assert.equal(await article.count(),1);await article.getByText('Record human decision',{exact:true}).click();
const decision=article.locator('form');await decision.getByLabel('Decision',{exact:true}).selectOption('Accepted');await decision.getByLabel('Reviewer name',{exact:true}).fill('Owner One');await decision.getByLabel('Decision rationale',{exact:true}).fill('Customer context verified');await decision.getByLabel('Concrete future-state specification',{exact:true}).fill('Read CRM account ID with manual correction.');await decision.getByRole('checkbox').check();await decision.getByRole('button').click();
assert.equal((await read()).forms[0].decisions[0].status,'Accepted');
await stage('Decide / Export');assert.match(await page.locator('#forms .fac-table').innerText(),/Read CRM account ID/);
const downloadEvent=page.waitForEvent('download');await click('export');const download=await downloadEvent;await download.saveAs(path.join(artifactDir,'forms-e2e-export.json'));const pkg=JSON.parse(await fs.readFile(path.join(artifactDir,'forms-e2e-export.json'),'utf8'));assert.equal(pkg.acceptedDecisionRegister.length,1);assert.equal(pkg.futureState.actions[0].treatment,'Prefill');
await page.screenshot({path:path.join(artifactDir,'forms-future-desktop.png'),fullPage:true});
await page.reload({waitUntil:'networkidle'});await page.locator('[data-workspace-select="forms"]').click();await page.locator('#forms [data-fac="open"]').click();await stage('Decide / Export');assert.match(await page.locator('#forms .fac-table').innerText(),/Read CRM account ID/);
await stage('Verify Structure');await page.locator('#forms .fac-structure').getByRole('button',{name:'Customer account',exact:true}).click();await form('field').getByLabel('Instructions',{exact:true}).fill('New instructions');await form('field').getByRole('button',{name:'Save field',exact:true}).click();assert.equal(await page.locator('#forms [data-stage="Analyze"]').isDisabled(),true);assert.equal((await read()).forms[0].decisions.length,1);
await click('sample');assert.equal((await read()).forms.length,2);await page.locator('#forms .fac-structure').getByRole('button',{name:'Requester identity check',exact:true}).click();await page.locator('#forms select[name="depth"]').selectOption('Architecture Analysis');
await page.screenshot({path:path.join(artifactDir,'forms-analysis-desktop.png'),fullPage:true});
// Create existing graph context through the application module's local persistence contract.
await page.evaluate(()=>localStorage.setItem('roi-ea-application-modernization-m1-v0.1',JSON.stringify({graphNodes:[{id:'crm-e2e',label:'Existing CRM',nodeType:'application'}],graphEdges:[],applications:[]})));
await page.locator('#forms select[name="depth"]').selectOption('Quick Scan');await page.locator('#forms select[name="depth"]').selectOption('Architecture Analysis');await form('relationship').getByLabel('Architecture object',{exact:true}).selectOption('crm-e2e');await form('relationship').getByLabel('Relationship evidence / source',{exact:true}).fill('Owner interview');await form('relationship').getByRole('button').click();await click('project');assert.match(await page.locator('#fac-status').innerText(),/projected/);
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('roi-ea-application-modernization-m1-v0.1')).graphEdges.length),1);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifactDir,'forms-analysis-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
await page.setViewportSize({width:1440,height:1000});await page.locator('[data-workspace-select="roi"]').click();assert.equal(await page.locator('#overview').isVisible(),true);await page.locator('[data-workspace-select="forms"]').click();assert.equal(await page.locator('#forms').isVisible(),true);
// Unsaved edits require an explicit discard choice when leaving the workspace.
await stage('Verify Structure');await page.locator('#forms .fac-structure').getByRole('button',{name:'Requester identity check',exact:true}).click();await form('field').getByLabel('Field label',{exact:true}).fill('Unsaved edit');acceptDialog=false;await page.locator('[data-workspace-select="roi"]').click();assert.equal(await page.locator('#forms').isVisible(),true);assert.equal(await form('field').getByLabel('Field label',{exact:true}).inputValue(),'Unsaved edit');acceptDialog=true;await click('list');
assert.deepEqual(errors,[]);
// Malformed storage is protected and recoverable in a separate isolated browser context.
const bad=await browser.newContext();await bad.addInitScript(()=>localStorage.setItem('roi-ea-forms-analysis-v1','broken'));const bp=await bad.newPage();await bp.goto(`${baseUrl}/index.html`,{waitUntil:'networkidle'});await bp.locator('[data-workspace-select="forms"]').click();assert.match(await bp.locator('#fac-error').innerText(),/protected from overwrite/);await bp.locator('#forms [data-fac="sample"]').click();assert.equal(await bp.evaluate(()=>localStorage.getItem('roi-ea-forms-analysis-v1')),'broken');await bad.close();
console.log('PASS: empty state, navigation, text import, field editing, verification gate, scan, human acceptance, future state, JSON export, reload, stale-decision protection, sample, graph projection, narrow layout, malformed storage, regression navigation and no browser runtime errors.');
}catch(error){await page.screenshot({path:path.join(artifactDir,'forms-e2e-failure.png'),fullPage:true});console.error('Browser errors:',errors);throw error;}finally{await browser.close();}
