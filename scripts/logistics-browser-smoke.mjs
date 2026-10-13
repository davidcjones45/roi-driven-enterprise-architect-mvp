/** Isolated synthetic browser verification; never use a client profile. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const {chromium}=await import(process.env.LOG_PLAYWRIGHT_MODULE||'playwright');
const dir=process.env.LOG_TEST_ARTIFACTS||path.join(os.tmpdir(),'roi-ea-logistics-browser');await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.LOG_BROWSER_EXECUTABLE?{executablePath:process.env.LOG_BROWSER_EXECUTABLE}:{})});
const base=process.env.LOG_BASE_URL||'http://127.0.0.1:8766';
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];let accept=true;
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>accept?d.accept():d.dismiss());
const click=action=>page.locator(`#logistics [data-log="${action}"]`).click();
const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('roi-ea-logistics-release-v0.1')));
async function review(kind,choice){const f=page.locator(`[data-log-review="${kind}"]`);await f.getByLabel('Reviewer',{exact:true}).fill('Synthetic reviewer');await f.getByLabel('Rationale',{exact:true}).fill('<script>throw Error("unescaped")</script> Reviewed fixture evidence and rivals.');if(choice)await f.locator('[name="choice"]').selectOption(choice);if(kind==='hypothesis')await f.getByLabel('Evidence IDs (comma separated)').fill('E-2,E-5,E-6,E-capacity');await f.getByRole('checkbox').check();await f.getByRole('button').click();}
try{
 await page.goto(`${base}/index.html`,{waitUntil:'networkidle'});
 await page.locator('#workspace-library').evaluate(e=>e.open=true);await page.locator('[data-workspace-select="logistics"]').click();assert.match(await page.locator('#logistics').innerText(),/No diagnostic cases/);
 await page.evaluate(()=>localStorage.setItem('unrelated-log-test','retain'));await click('load');assert.equal((await read()).cases.length,1);
 assert.match(await page.locator('#logistics').innerText(),/38 min/);await click('preview');assert.match(await page.locator('#log-status').innerText(),/decision/);
 await review('evidence');await review('hypothesis','D-03');assert.match(await page.locator('#logistics').innerText(),/Constraint disposition: VALIDATED/);await review('decision','A1');await review('outcome','transfer');assert.match(await page.locator('#logistics').innerText(),/TRANSFERRED/);
 await review('hypothesis','UNRESOLVED');await click('preview');assert.match(await page.locator('#log-status').innerText(),/decision/);const stale=await read();assert.equal(stale.cases[0].decisions.length,1);assert.equal(stale.cases[0].outcomes.length,1);
 await review('hypothesis','D-03');await review('decision','A1');await review('outcome','transfer');
 await click('preview');await page.locator('[data-log="cancel"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('roi-ea-application-modernization-m1-v0.1')),null);
 await click('preview');await page.locator('[data-log="commit"]').click();assert.match(await page.locator('#log-status').innerText(),/Confirm/);await page.locator('#log-projection-confirm').check();await page.locator('[data-log="commit"]').click();assert.match(await page.locator('#log-status').innerText(),/Architecture saved.*ROI saved/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-log-test')),'retain');
 const wait=page.waitForEvent('download');await click('export');const d=await wait;const output=path.join(dir,'logistics.json');await d.saveAs(output);const pkg=JSON.parse(await fs.readFile(output,'utf8'));assert.equal(pkg.case.decisions.length,2);assert.equal(pkg.projection.canonicalization,false);assert.equal(pkg.projection.evaluations.outcome[0].realizedOutcomeSupported,false);
 const reportWait=page.waitForEvent('download');await click('report');const report=await reportWait;const htmlPath=path.join(dir,'logistics.html');await report.saveAs(htmlPath);const html=await fs.readFile(htmlPath,'utf8');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>throw'));
 await page.screenshot({path:path.join(dir,'logistics-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'logistics-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1440,height:1000});
 await page.reload({waitUntil:'networkidle'});await page.locator('#workspace-library').evaluate(e=>e.open=true);await page.locator('[data-workspace-select="logistics"]').click();assert.equal((await read()).cases[0].decisions.length,2);
await page.locator('#logistics details').first().locator('summary').click();
 const source=page.locator('#log-source');const value=JSON.parse(await source.inputValue());value.readiness.conflicting=true;await source.fill(JSON.stringify(value));accept=false;await page.locator('[data-workspace-select="roi"]').click();assert.equal(await page.locator('#logistics').isVisible(),true);accept=true;await click('source');assert.equal((await read()).cases[0].revision,2);assert.match(await page.locator('#logistics').innerText(),/Diagnostic eligibility: UNKNOWN/);assert.equal((await read()).cases[0].decisions.length,2);
 await page.locator('[data-workspace-select="roi"]').click();assert.equal(await page.locator('#overview').isVisible(),true);assert.deepEqual(errors,[]);
 const bad=await browser.newContext();await bad.addInitScript(()=>localStorage.setItem('roi-ea-logistics-release-v0.1','broken'));const bp=await bad.newPage();await bp.goto(`${base}/index.html`,{waitUntil:'networkidle'});await bp.locator('#workspace-library').evaluate(e=>e.open=true);await bp.locator('[data-workspace-select="logistics"]').click();assert.equal(await bp.locator('[data-log="load"]').isDisabled(),true);assert.equal(await bp.evaluate(()=>localStorage.getItem('roi-ea-logistics-release-v0.1')),'broken');await bad.close();
 console.log('PASS Logistics complete synthetic review, native projection, cancel/confirmation, transfer analysis, exports, reload, stale-source invalidation, navigation, mobile overflow, corrupt storage, unrelated data and runtime errors.');
 }catch(error){
 await page.screenshot({path:path.join(dir,'logistics-failure.png'),fullPage:true}).catch(()=>{});
 await fs.writeFile(path.join(dir,'browser-errors.json'),JSON.stringify({message:error.message,stack:error.stack,pageErrors:errors},null,2));
 throw error;
}finally{await browser.close();}
