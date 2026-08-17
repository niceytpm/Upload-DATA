(function(){
'use strict';

const q=id=>document.getElementById(id);
const state={rows:[],base:[],factory:'',version:'',currentIndex:-1,checked:new Set(),scanner:null,cameraOn:false};
const DRAFT_PREFIX='eq_machine_check_draft_v1:';

function injectStyles(){
  const style=document.createElement('style');
  style.textContent=`
  .checkMenuBtn{background:linear-gradient(135deg,#f59e0b,#d97706)!important;color:#1b1000!important;border:1px solid #fbbf24!important}
  .checkGrid{display:grid;grid-template-columns:minmax(430px,1.55fr) minmax(260px,.65fr);gap:16px;align-items:start}
  .checkScanRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end}
  .checkScanRow .scanField{grid-column:1/-1}
  .checkResult{margin-top:14px;border:1px solid #31445f;border-radius:18px;padding:16px;background:#08111f}
  .checkResult.ok{border-color:#22c55e}.checkResult.missing{border-color:#f59e0b}.checkResult.editing{border-color:#38bdf8}
  .checkResultTitle{font-size:19px;font-weight:900;margin-bottom:12px}
  .checkFields{display:grid;grid-template-columns:1fr;gap:8px}
  .checkFields label{margin-top:7px}
  .checkFields input{min-width:0;width:100%}
  .checkActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .checkStats{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}
  .checkStat{padding:8px 9px;border:1px solid #26364d;border-radius:11px;background:#08111f;font-size:12px}.checkStat b{display:block;font-size:18px}
  .cameraBox{margin-top:12px;border:1px solid #31445f;border-radius:16px;overflow:hidden;background:#050914;min-height:280px}
  #qrReader{width:100%}.checkRecent{display:grid;gap:8px;max-height:420px;overflow:auto}
  .checkRecentItem{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 9px;border:1px solid #26364d;border-radius:10px;background:#08111f;font-size:13px}
  .checkRecentItem small{color:#91a3b8}.checkStatus{font-size:12px;font-weight:800;border-radius:999px;padding:4px 8px;background:#123a25;color:#cbf7d8}
  .suggestWrap{position:relative}.suggestList{position:absolute;left:0;right:0;top:100%;z-index:20;max-height:190px;overflow:auto;background:#0b1220;border:1px solid #38bdf8;border-radius:12px;margin-top:4px;padding:5px;box-shadow:0 16px 40px rgba(0,0,0,.5)}
  .suggestItem{display:block;width:100%;text-align:left;background:#101d30!important;color:#e5edf7!important;border:0!important;margin:2px 0;padding:10px 12px!important}.suggestItem:hover{background:#163c5a!important}
  @media(max-width:900px){.checkGrid{grid-template-columns:1fr}.checkStats{grid-template-columns:repeat(4,1fr)}}
  @media(max-width:600px){.checkStats{grid-template-columns:1fr 1fr}}
  @media(max-width:460px){.checkScanRow{grid-template-columns:1fr}.checkScanRow .scanField{grid-column:auto}.checkActions button{width:100%}}
  `;
  document.head.appendChild(style);
}

function injectUi(){
  const editorBtn=q('btnOpenEditor');
  if(editorBtn){
    const btn=document.createElement('button');
    btn.id='btnOpenMachineCheck';btn.className='checkMenuBtn hidden';btn.textContent='เช็คเลขเครื่อง';
    editorBtn.insertAdjacentElement('afterend',btn);
  }
  const main=document.createElement('main');
  main.id='machineCheckView';main.className='wrap hidden';
  main.innerHTML=`
    <div class="top"><div><h1>เช็คเลขเครื่องด้วย QR</h1><p class="sub">ยิง QR แล้วตรวจสอบทีละเครื่อง</p></div>
      <div class="actions" style="margin-top:0"><button id="btnCheckReload" class="secondary">โหลดข้อมูลล่าสุด</button><button id="btnCheckBack" class="secondary">กลับ</button></div></div>
    <div class="checkGrid">
      <section class="card">
        <h2>สแกนเลขเครื่อง</h2>
        <label>โรงงาน</label><select id="checkFactorySelect"></select>
        <div class="checkScanRow">
          <div class="scanField"><label>ID Machine จาก QR</label><input id="checkScanInput" autocomplete="off" autocapitalize="characters" placeholder="ยิง QR หรือพิมพ์แล้วกด Enter"></div>
          <button id="btnCheckConfirmScan">ค้นหา</button><button id="btnCheckCamera" class="secondary">เปิดกล้อง</button>
        </div>
        <div id="checkCameraBox" class="cameraBox hidden"><div id="qrReader"></div></div>
        <p class="hint">เครื่องยิง QR ใช้ได้ทันที ส่วนกล้องต้องอนุญาตสิทธิ์กล้องและเปิดเว็บผ่าน HTTPS</p>
        <div id="checkResult" class="checkResult hidden"></div>
      </section>
      <section class="card">
        <div class="cardHead"><h2>สถานะการตรวจ</h2><button id="btnClearChecked" class="secondary">ล้างสถานะตรวจ</button></div>
        <div id="checkStats" class="checkStats"></div>
        <div id="checkRecent" class="checkRecent"><div class="notice">ยังไม่มีเครื่องที่ตรวจ</div></div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="cardHead"><div><h2>Preview ก่อนบันทึก</h2><p id="checkVersionText" class="hint" style="margin:4px 0 0">ยังไม่ได้โหลดข้อมูล</p></div><button id="btnCheckSave" disabled>บันทึกและอัปโหลด</button></div>
      <div id="checkDiff" class="preview empty">ยังไม่มีรายการเปลี่ยนแปลง</div>
    </section>`;
  document.body.insertBefore(main,q('downloadModal'));
}

function allMainIds(){return ['app','adminView','editorView','machineCheckView'];}
function showOnly(id){allMainIds().forEach(x=>{const el=q(x);if(el)el.classList.add('hidden')});q(id)?.classList.remove('hidden')}
function normalizeText(v){return String(v??'').trim().toUpperCase().replace(/\s+/g,' ')}
function clone(list){return list.map(r=>({machineId:r.machineId,model:r.model,number:Number(r.number),department:r.department}))}
function draftKey(){return DRAFT_PREFIX+encodeURIComponent(state.factory)}
function checkedKey(){return 'eq_machine_checked_v1:'+encodeURIComponent(state.factory)}
function uniqueFrom(rows,field){return [...new Set((rows||[]).map(r=>normalizeText(r[field])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}))}
function unique(field){return uniqueFrom(state.rows,field)}

function saveDraft(){
  if(!state.factory)return;
  const changes=diffRows(state.base,state.rows);
  if(changes.length)localStorage.setItem(draftKey(),JSON.stringify({rows:state.rows,baseVersion:state.version,savedAt:new Date().toISOString()}));
  else localStorage.removeItem(draftKey());
}
function loadChecked(){try{state.checked=new Set(JSON.parse(localStorage.getItem(checkedKey())||'[]'))}catch{state.checked=new Set()}}
function saveChecked(){localStorage.setItem(checkedKey(),JSON.stringify([...state.checked]))}

function setupSuggest(input,field,sourceRows=()=>state.rows){
  if(!input||input.dataset.suggestReady==='1')return;
  input.dataset.suggestReady='1';
  input.classList.add('suggestInput');
  let box=input.parentElement?.querySelector('.suggestList');
  if(!box){const wrap=document.createElement('div');wrap.className='suggestWrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);box=document.createElement('div');box.className='suggestList hidden';wrap.appendChild(box)}
  const render=()=>{
    const query=normalizeText(input.value);let values=uniqueFrom(sourceRows(),field);
    if(query)values=values.filter(v=>v.includes(query)||query.split(' ').every(p=>v.includes(p)));
    values=values.slice(0,10);box.innerHTML=values.map(v=>`<button type="button" class="suggestItem" data-value="${esc(v)}">${esc(v)}</button>`).join('');
    box.classList.toggle('hidden',!values.length);
    box.querySelectorAll('.suggestItem').forEach(b=>b.onclick=()=>{input.value=b.dataset.value;box.classList.add('hidden');input.dispatchEvent(new Event('input',{bubbles:true}))});
  };
  input.addEventListener('input',render);input.addEventListener('focus',render);
  input.addEventListener('blur',()=>setTimeout(()=>box.classList.add('hidden'),180));
}

function machineFields(row,editable){
  return `<div class="checkFields">
    <div><label>ID Machine</label><input id="checkEditId" value="${esc(row.machineId||'')}" ${editable?'':'readonly'}></div>
    <div><label>Model</label><input id="checkEditModel" value="${esc(row.model||'')}" ${editable?'':'readonly'}></div>
    <div><label>No.</label><input id="checkEditNo" inputmode="numeric" value="${esc(Number.isFinite(Number(row.number))?row.number:'')}" ${editable?'':'readonly'}></div>
    <div><label>Department</label><input id="checkEditDept" value="${esc(row.department||'')}" ${editable?'':'readonly'}></div>
  </div>`;
}

function focusScanner(){const input=q('checkScanInput');input.value='';setTimeout(()=>input.focus(),80)}
function showFound(index){
  state.currentIndex=index;const row=state.rows[index],box=q('checkResult');box.className='checkResult ok';box.innerHTML=`<div class="checkResultTitle">พบเลขเครื่อง ✓</div>${machineFields(row,false)}
    <div class="checkActions"><button id="btnMachineCorrect" class="greenbtn">ถูกต้อง — ยิงเครื่องถัดไป</button><button id="btnMachineWrong" class="secondary">ไม่ถูกต้อง — แก้ไข</button></div>`;
  box.classList.remove('hidden');q('btnMachineCorrect').onclick=()=>acceptChecked(row.machineId,'ถูกต้อง');q('btnMachineWrong').onclick=()=>showEdit(index);
}
function showEdit(index){
  const row=state.rows[index],box=q('checkResult');box.className='checkResult editing';box.innerHTML=`<div class="checkResultTitle">แก้ไขข้อมูลเครื่อง</div>${machineFields(row,true)}
    <div class="checkActions"><button id="btnApplyMachineEdit">ยืนยันการแก้ไข</button><button id="btnCancelMachineEdit" class="secondary">ยกเลิก</button></div>`;
  setupSuggest(q('checkEditModel'),'model');setupSuggest(q('checkEditDept'),'department');
  q('btnApplyMachineEdit').onclick=()=>applyEdit(index);q('btnCancelMachineEdit').onclick=()=>showFound(index);
}
function showMissing(id){
  state.currentIndex=-1;const box=q('checkResult');box.className='checkResult missing';box.innerHTML=`<div class="checkResultTitle">ไม่พบเลขเครื่อง — เพิ่มใหม่ได้</div>${machineFields({machineId:id,model:'',number:'',department:''},true)}
    <div class="checkActions"><button id="btnAddScannedMachine" class="greenbtn">เพิ่มเลขเครื่อง</button><button id="btnCancelScannedMachine" class="secondary">ยกเลิก</button></div>`;
  setupSuggest(q('checkEditModel'),'model');setupSuggest(q('checkEditDept'),'department');
  q('btnAddScannedMachine').onclick=addScanned;q('btnCancelScannedMachine').onclick=()=>{box.classList.add('hidden');focusScanner()};
}
function readForm(){return normalizeEditorRow({machineId:q('checkEditId').value,model:q('checkEditModel').value,number:q('checkEditNo').value,department:q('checkEditDept').value})}
function validateForm(row,ignoreIndex=-1){
  if(!row.machineId||!row.model||!row.department||Number.isNaN(row.number))throw new Error('กรอก ID Machine, Model, No. และ Department ให้ครบ');
  const duplicate=state.rows.findIndex((r,i)=>i!==ignoreIndex&&normalizeText(r.machineId)===row.machineId);
  if(duplicate>=0)throw new Error('ID Machine ซ้ำกับข้อมูลเดิม: '+row.machineId);
}
function applyEdit(index){try{const oldId=state.rows[index].machineId,row=readForm();validateForm(row,index);state.rows[index]=row;state.checked.delete(normalizeText(oldId));acceptChecked(row.machineId,'แก้ไขแล้ว');saveDraft();renderDiff()}catch(e){alert(e.message||e)}}
function addScanned(){try{const row=readForm();validateForm(row);state.rows.unshift(row);acceptChecked(row.machineId,'เพิ่มใหม่');saveDraft();renderDiff()}catch(e){alert(e.message||e)}}
function acceptChecked(id,status){state.checked.add(normalizeText(id));saveChecked();renderStats();renderRecent(id,status);q('checkResult').classList.add('hidden');focusScanner()}

function extractMachineId(value){
  const raw=normalizeText(value);if(!raw)return'';
  // QR บางรุ่นเก็บหลายบรรทัด/URL: ให้หา ID ที่มีอยู่ในฐานข้อมูลก่อน
  const exact=state.rows.find(r=>raw.includes(normalizeText(r.machineId)));
  if(exact)return normalizeText(exact.machineId);
  // รูปแบบ Asset No. ที่พบบนป้าย เช่น EFAZZ0001565
  const asset=raw.match(/\b[A-Z]{3,8}[0-9]{5,14}\b/);
  if(asset)return asset[0];
  // ถ้าเป็นข้อความ "Asset No: ..." ให้ตัดเฉพาะค่าหลังหัวข้อ
  const labelled=raw.match(/(?:ASSET\s*(?:NO|NUMBER)?|MACHINE\s*ID)\s*[:#=-]?\s*([A-Z0-9_-]{6,30})/);
  return labelled?labelled[1]:raw;
}
function handleScan(value){
  const raw=normalizeText(value),id=extractMachineId(raw);if(!id)return;
  q('checkScanInput').value=id;
  const index=state.rows.findIndex(r=>normalizeText(r.machineId)===id);
  if(index>=0)showFound(index);else showMissing(id);
}
function renderStats(){
  const changed=diffRows(state.base,state.rows).length,checked=state.checked.size;
  q('checkStats').innerHTML=`<div class="checkStat"><b>${state.rows.length.toLocaleString()}</b>ทั้งหมด</div><div class="checkStat"><b>${checked.toLocaleString()}</b>ตรวจแล้ว</div><div class="checkStat"><b>${changed.toLocaleString()}</b>เปลี่ยนแปลง</div><div class="checkStat"><b>${Math.max(0,state.rows.length-checked).toLocaleString()}</b>ยังไม่ตรวจ</div>`;
}
function renderRecent(id,status){
  const box=q('checkRecent');if(box.querySelector('.notice'))box.innerHTML='';const row=state.rows.find(r=>normalizeText(r.machineId)===normalizeText(id));
  const item=document.createElement('div');item.className='checkRecentItem';item.innerHTML=`<div><b>${esc(id)}</b><br><small>${esc(row?`${row.model} / #${row.number} / ${row.department}`:'')}</small></div><span class="checkStatus">${esc(status)}</span>`;box.prepend(item);while(box.children.length>30)box.lastElementChild.remove();
}
function renderDiff(){
  const diff=diffRows(state.base,state.rows),box=q('checkDiff');q('btnCheckSave').disabled=!diff.length;
  if(!diff.length){box.className='preview empty';box.textContent='ยังไม่มีรายการเปลี่ยนแปลง';renderStats();return}
  box.className='preview';box.innerHTML=`<table><thead><tr><th>สถานะ</th><th>ID Machine</th><th>ก่อนแก้</th><th>หลังแก้</th></tr></thead><tbody>${diff.slice(0,300).map(d=>`<tr><td><span class="tag ${esc(d.cls)}">${esc(d.type)}</span></td><td>${esc(d.id)}</td><td>${esc(fmt(d.before))}</td><td>${esc(fmt(d.after))}</td></tr>`).join('')}</tbody></table>`;renderStats();
}

async function loadData(force=false){
  const factory=q('checkFactorySelect').value||currentFactory;if(!factory)throw new Error('กรุณาเลือกโรงงาน');
  showLoading('กำลังโหลดข้อมูลเลขเครื่อง...','กรุณารอสักครู่');
  try{
    const data=await fetchFactoryData(factory,force);state.factory=factory;currentFactory=factory;state.base=clone(data.rows);state.rows=clone(data.rows);state.version=data.version||'';
    const raw=localStorage.getItem(draftKey());if(raw){try{const draft=JSON.parse(raw);if(Array.isArray(draft.rows)&&confirm('พบรายการเช็ค/แก้ไขที่ยังไม่ได้อัปโหลด ต้องการกู้คืนหรือไม่?'))state.rows=clone(draft.rows)}catch{}}
    loadChecked();q('checkVersionText').textContent=`เวอร์ชันล่าสุด ${state.version||'-'} • เวอร์ชันถัดไป ${nextVersion(state.version||'1.0.0')}`;q('checkResult').classList.add('hidden');renderDiff();focusScanner();
  }finally{hideLoading()}
}

function syncFactories(){
  const sel=q('checkFactorySelect');sel.innerHTML=factories.map(f=>`<option value="${esc(f.slug)}">${esc(f.name)} (${esc(f.version||'0.0.0')})</option>`).join('');
  const wanted=currentFactory||factories[0]?.slug||'';if(wanted)sel.value=wanted;
}

async function openCheck(){
  if(!isSuperadminClient())return;closeMenu();syncFactories();showOnly('machineCheckView');
  try{await loadData(false)}catch(e){alert(e.message||e)}
}

async function saveUpload(){
  try{
    const cleaned=validateEditorRows(state.rows),changes=diffRows(state.base,cleaned);if(!changes.length)throw new Error('ไม่มีรายการเปลี่ยนแปลง');
    const version=nextVersion(state.version||'1.0.0'),factoryName=factories.find(f=>f.slug===state.factory)?.name||state.factory;
    const ok=await askUploadConfirm('ยืนยันบันทึกจากการเช็ค QR',`โรงงาน: ${factoryName}\nData Version: ${version}\nรายการเปลี่ยนแปลง: ${changes.length.toLocaleString()} รายการ\nตรวจแล้ว: ${state.checked.size.toLocaleString()} เครื่อง\n\nต้องการบันทึกและอัปโหลดหรือไม่?`,'ยืนยันบันทึกและอัปโหลด');if(!ok)return;
    q('btnCheckSave').disabled=true;showLoading('กำลังบันทึกข้อมูล...','กำลังสร้าง DB และ Excel');
    const bytes=await buildDb(cleaned),xls=buildExcel(cleaned);
    const result=await api('upload-data',{factory:state.factory,dbBase64:bytesToB64(bytes),excelBase64:bytesToB64(new Uint8Array(xls)),excelFileName:'data.xlsx',version,versionOverride:false,changes:historyChanges(changes),totalRows:cleaned.length});
    state.version=result.version||version;state.base=clone(cleaned);state.rows=clone(cleaned);factoryDataCache.set(state.factory,{factory:state.factory,rows:clone(cleaned),version:state.version,loadedAt:Date.now(),source:'qr-check'});localStorage.removeItem(draftKey());
    q('checkVersionText').textContent=`เวอร์ชันล่าสุด ${state.version} • เวอร์ชันถัดไป ${nextVersion(state.version)}`;renderDiff();successPopup('บันทึกการเช็คสำเร็จ ✅',`DataVersion ${state.version}`);
  }catch(e){alert(e.message||e)}finally{hideLoading();renderDiff()}
}

function loadQrLibrary(){return new Promise((resolve,reject)=>{if(window.Html5Qrcode)return resolve();const s=document.createElement('script');s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('โหลดระบบสแกน QR ไม่สำเร็จ'));document.head.appendChild(s)})}
async function stopCamera(){if(state.scanner){try{await state.scanner.stop()}catch{}try{state.scanner.clear()}catch{}state.scanner=null}state.cameraOn=false;q('checkCameraBox').classList.add('hidden');q('btnCheckCamera').textContent='เปิดกล้อง'}
async function toggleCamera(){
  if(state.cameraOn)return stopCamera();
  try{
    await loadQrLibrary();q('checkCameraBox').classList.remove('hidden');
    state.scanner=new Html5Qrcode('qrReader',{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
    const qrbox=(w,h)=>{const side=Math.floor(Math.min(w,h)*0.92);return{width:Math.max(250,side),height:Math.max(250,side)}};
    await state.scanner.start({facingMode:'environment'},{fps:25,qrbox,aspectRatio:1.0,disableFlip:false,experimentalFeatures:{useBarCodeDetectorIfSupported:true}},async text=>{
      const id=extractMachineId(text);q('checkScanInput').value=id||text;await stopCamera();handleScan(text);
    },()=>{});
    state.cameraOn=true;q('btnCheckCamera').textContent='ปิดกล้อง';
  }catch(e){await stopCamera();alert('เปิดกล้องไม่ได้: '+(e.message||e)+'\nกรุณาอนุญาตกล้องและเปิดเว็บผ่าน HTTPS')}
}

function wire(){
  q('btnOpenMachineCheck').onclick=openCheck;q('btnCheckBack').onclick=async()=>{await stopCamera();showOnly('app')};
  q('btnCheckReload').onclick=()=>loadData(true).catch(e=>alert(e.message||e));q('btnCheckConfirmScan').onclick=()=>handleScan(q('checkScanInput').value);
  q('checkScanInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleScan(e.currentTarget.value)}});
  q('btnCheckCamera').onclick=toggleCamera;q('btnCheckSave').onclick=saveUpload;
  q('checkFactorySelect').onchange=()=>{stopCamera();currentFactory=q('checkFactorySelect').value;if(q('factorySelect'))q('factorySelect').value=currentFactory;if(q('editorFactorySelect'))q('editorFactorySelect').value=currentFactory;loadData(false).catch(e=>alert(e.message||e))};
  q('btnClearChecked').onclick=()=>{if(confirm('ล้างเฉพาะสถานะตรวจแล้วของโรงงานนี้หรือไม่?')){state.checked.clear();saveChecked();q('checkRecent').innerHTML='<div class="notice">ยังไม่มีเครื่องที่ตรวจ</div>';renderStats()}};
  const refreshCheckPermission=()=>{
    const btn=q('btnOpenMachineCheck');
    if(btn)btn.classList.toggle('hidden',!isSuperadminClient());
  };
  const oldRenderRole=window.renderRole||renderRole;window.renderRole=renderRole=function(){oldRenderRole();refreshCheckPermission()};
  const oldClear=window.clearLocalSession||clearLocalSession;window.clearLocalSession=clearLocalSession=async function(){await stopCamera();q('machineCheckView')?.classList.add('hidden');return oldClear()};

  // เพิ่มคำแนะนำ Model / Department ให้หน้าแก้ไขเลขเครื่องเดิม
  const enhanceEditorSuggestions=()=>{
    setupSuggest(q('addModel'),'model',()=>editorRows);
    setupSuggest(q('addDepartment'),'department',()=>editorRows);
    q('editorTable')?.querySelectorAll('[data-edit="model"]').forEach(input=>setupSuggest(input,'model',()=>editorRows));
    q('editorTable')?.querySelectorAll('[data-edit="department"]').forEach(input=>setupSuggest(input,'department',()=>editorRows));
  };
  const oldRenderEditorTable=window.renderEditorTable||renderEditorTable;
  window.renderEditorTable=renderEditorTable=function(){const result=oldRenderEditorTable();enhanceEditorSuggestions();return result};
  enhanceEditorSuggestions();
  // รองรับกรณี session เดิม Login สำเร็จก่อนที่ไฟล์เสริมจะโหลด
  refreshCheckPermission();
  setTimeout(refreshCheckPermission,300);
  setTimeout(refreshCheckPermission,1200);
  setInterval(refreshCheckPermission,2000);
  if(q('roleBadge'))new MutationObserver(refreshCheckPermission).observe(q('roleBadge'),{childList:true,subtree:true,attributes:true});
}

function isSuperadminClient(){
  const roleFromAccount=String(typeof me!=='undefined'&&me?.role||'').trim().toLowerCase();
  const badge=q('roleBadge');
  const roleFromBadge=String(badge?.textContent||'').trim().toLowerCase();
  return roleFromAccount==='superadmin'||badge?.classList.contains('superadmin')||/(^|\s|\/)superadmin(\s|$)/i.test(roleFromBadge);
}

injectStyles();injectUi();wire();
})();
