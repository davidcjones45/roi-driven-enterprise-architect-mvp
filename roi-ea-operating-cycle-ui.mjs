/**
 * ROI-Driven Enterprise Architect — A9 operating-cycle shell integration.
 *
 * This module is presentation/orientation only. It consumes the A8 logical
 * screen contract and never derives approval, authorization, recommendation,
 * or domain readiness from the current browser view.
 */

import { OPERATING_CYCLE_SCREENS } from './roi-ea-cross-screen-operating-cycle-model.mjs';

export const VIEW_TO_CYCLE_SCREEN = Object.freeze({
  overview:'DECISION_OVERVIEW',
  opportunity:'DECISION_OVERVIEW',
  consequential:'DECISION_OVERVIEW',

  evidence:'BUSINESS_CASE_EVIDENCE',
  baseline:'BUSINESS_CASE_EVIDENCE',
  'compliance-cost':'BUSINESS_CASE_EVIDENCE',

  inventory:'ARCHITECTURE_AUTHORITY',
  authority:'ARCHITECTURE_AUTHORITY',
  'authority-portfolio':'ARCHITECTURE_AUTHORITY',
  architecture:'ARCHITECTURE_AUTHORITY',
  regulatory:'ARCHITECTURE_AUTHORITY',

  risk:'PROCESS_AI_ANALYSIS',
  pilot:'PROCESS_AI_ANALYSIS',
  results:'PROCESS_AI_ANALYSIS',
  feoa:'PROCESS_AI_ANALYSIS',
  federated:'PROCESS_AI_ANALYSIS',
  'community-banking':'PROCESS_AI_ANALYSIS',
  'mortgage-demo':'PROCESS_AI_ANALYSIS',

  dossier:'DECISION_EXECUTIVE_PACKAGE',
  recommendation:'DECISION_EXECUTIVE_PACKAGE',
  'executive-package':'DECISION_EXECUTIVE_PACKAGE',
  snapshots:'DECISION_EXECUTIVE_PACKAGE'
});

export const CYCLE_SCREEN_DEFAULT_VIEWS = Object.freeze({
  DECISION_OVERVIEW:'overview',
  BUSINESS_CASE_EVIDENCE:'baseline',
  ARCHITECTURE_AUTHORITY:'architecture',
  PROCESS_AI_ANALYSIS:'risk',
  DECISION_EXECUTIVE_PACKAGE:'dossier'
});

export function cycleScreenForView(view = '') {
  return VIEW_TO_CYCLE_SCREEN[String(view || '').trim()] || null;
}

export function normalizeBpmnCycleSnapshot(snapshot = {}) {
  return {
    staged:snapshot.staged === true,
    reviewStatus:String(snapshot.reviewStatus || 'NOT_STAGED'),
    sourceId:String(snapshot.sourceId || ''),
    candidateCount:Number.isFinite(Number(snapshot.candidateCount)) ? Number(snapshot.candidateCount) : 0,
    dossierAvailable:snapshot.dossierAvailable === true,
    readOnlyVisualization:snapshot.readOnlyVisualization !== false,
    executesWorkflow:false,
    establishesProcessValidity:false,
    createsAuthority:false,
    createsAuthorization:false,
    createsComplianceConclusion:false
  };
}

export function bpmnCycleContextText(snapshot = {}) {
  const item = normalizeBpmnCycleSnapshot(snapshot);
  if (!item.staged) {
    return 'Process & AI Analysis · No standards-aware BPMN source is staged. The viewer remains read-only and creates no process-validity, authority, compliance, or implementation conclusion.';
  }
  const status = item.reviewStatus.replaceAll('_',' ');
  return `Process & AI Analysis · BPMN ${status}; ${item.candidateCount} mapped candidate${item.candidateCount === 1 ? '' : 's'}. The source remains modeled evidence and the visualization is read-only; no workflow execution, process-validity, authority, compliance, or implementation conclusion is created.`;
}

export function buildOperatingCycleShellModel({
  currentView = 'overview',
  bpmnSnapshot = {}
} = {}) {
  const currentScreenKey = cycleScreenForView(currentView);
  return {
    currentView,
    currentScreenKey,
    screens:OPERATING_CYCLE_SCREENS.map((screen,index)=>({
      ...screen,
      ordinal:index + 1,
      active:screen.key === currentScreenKey,
      defaultView:CYCLE_SCREEN_DEFAULT_VIEWS[screen.key]
    })),
    bpmn:normalizeBpmnCycleSnapshot(bpmnSnapshot),

    // Presentation state never becomes decision state.
    readinessInferred:false,
    approvalInferred:false,
    authorizationInferred:false,
    recommendationInferred:false
  };
}

function makeButton(documentRef, screen, navigate) {
  const button=documentRef.createElement('button');
  button.type='button';
  button.className='operating-cycle-step';
  button.dataset.cycleScreen=screen.key;
  button.dataset.cycleView=screen.defaultView;
  button.setAttribute('aria-pressed',String(screen.active));
  if(screen.active) button.setAttribute('aria-current','step');

  const number=documentRef.createElement('span');
  number.className='operating-cycle-step-number';
  number.textContent=String(screen.ordinal);

  const label=documentRef.createElement('span');
  label.className='operating-cycle-step-label';
  label.textContent=screen.label;

  button.append(number,label);
  button.addEventListener('click',()=>navigate(screen.defaultView));
  return button;
}

export function renderOperatingCycleShell({
  root = document,
  currentView = 'overview',
  bpmnSnapshot = {},
  navigate = () => {}
} = {}) {
  const model=buildOperatingCycleShellModel({currentView,bpmnSnapshot});
  const host=root.querySelector('#operating-cycle-strip');
  if(host){
    host.replaceChildren();
    for(const screen of model.screens){
      host.append(makeButton(root,screen,navigate));
    }
  }

  const status=root.querySelector('#operating-cycle-status');
  if(status){
    const current=model.screens.find(screen=>screen.active);
    status.textContent=current
      ? `Logical operating-cycle context: ${current.label}. Screen context is orientation only; it does not establish readiness, approval, or authority.`
      : 'This view is outside the five-screen Second Edition operating-cycle projection.';
  }

  const bpmnContext=root.querySelector('#bpmn-cycle-context');
  if(bpmnContext) bpmnContext.textContent=bpmnCycleContextText(model.bpmn);

  return model;
}

export function createOperatingCycleShellController({
  root = document,
  navigate = () => {}
} = {}) {
  let currentView='overview';
  let bpmnSnapshot=normalizeBpmnCycleSnapshot();

  const render=()=>renderOperatingCycleShell({
    root,
    currentView,
    bpmnSnapshot,
    navigate
  });

  return {
    setView(view){
      currentView=String(view || '');
      return render();
    },
    setBpmnSnapshot(snapshot){
      bpmnSnapshot=normalizeBpmnCycleSnapshot(snapshot);
      return render();
    },
    render,
    getState(){
      return buildOperatingCycleShellModel({currentView,bpmnSnapshot});
    }
  };
}
