document.querySelectorAll('label > select').forEach(select=>{const label=select.parentElement;select.id=crypto.randomUUID();label.setAttribute('for',select.id);label.after(select);});
const fragment=new URLSearchParams(location.hash.slice(1));
const invitation=fragment.get('invitation');
const passwordToken=document.querySelector('#password-token');
if(passwordToken){passwordToken.value=fragment.get('reset')||invitation||'';document.querySelector('#password-kind').value=fragment.has('reset')?'reset':'invitation';history.replaceState(null,'',location.pathname);}
if(invitation){const field=document.querySelector('#invitation-token');if(field)field.value=invitation;history.replaceState(null,'',location.pathname);}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-add-spec]');if(!button)return;
 const list=button.closest('form').querySelector('.specifications');const row=list.firstElementChild.cloneNode(true);
 row.querySelectorAll('input').forEach(input=>{input.value='';input.id=crypto.randomUUID();input.previousElementSibling?.setAttribute('for',input.id);});list.appendChild(row);
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('form[data-api]'))return;event.preventDefault();
 const result=form.querySelector('.form-result'),button=form.querySelector('button:not([type="button"])');
 const data=new FormData(form),body=Object.fromEntries(data);
 if(form.querySelector('[name="roles"]'))body.roles=data.getAll('roles');
 ['handledIds','fileIds'].forEach(name=>{body[name]=data.getAll(name);});
 if(form.querySelector('.specifications'))body.specifications=data.getAll('spec_name').map((name,i)=>({name,value:data.getAll('spec_value')[i],unit:data.getAll('spec_unit')[i]})).filter(s=>s.name||s.value||s.unit);
 ['active','featured','pinned','confirmed','enabled'].forEach(name=>{if(form.querySelector(`[name="${name}"]`))body[name]=data.has(name);});
 button.disabled=true;result.textContent='저장 중입니다…';
 try{
  const response=await fetch(form.dataset.api,{method:body.saveMethod||'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':body.csrf},body:JSON.stringify(body)});
  const payload=await response.json();if(!response.ok){result.textContent=payload.error||'저장하지 못했습니다.';return;}
  if(payload.resetUrl){result.textContent='재설정 링크(1시간 유효·이 화면에서 한 번만 표시): '+payload.resetUrl;form.reset();const requestId=form.querySelector('[name="requestId"]');if(requestId)requestId.value=crypto.randomUUID();return;}
  if(payload.invitationUrl){result.textContent='초대 링크(48시간 유효·이 화면에서 한 번만 표시): '+payload.invitationUrl;form.reset();const requestId=form.querySelector('[name="requestId"]');if(requestId)requestId.value=crypto.randomUUID();return;}
  if(payload.redirect){location.assign(payload.redirect);return;}
  result.textContent='저장했습니다.';location.reload();
 }catch{result.textContent='저장 결과를 확인하지 못했습니다. 입력 내용을 유지한 채 최신 화면에서 결과를 확인해주세요.';}
 finally{button.disabled=false;}
});

document.querySelectorAll('[data-refresh-files]').forEach(button=>button.addEventListener('click',()=>location.reload()));
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('form[data-upload]'))return;event.preventDefault();
 const file=form.querySelector('[name="file"]').files[0],result=form.querySelector('.form-result'),button=form.querySelector('button');
 if(!file)return;button.disabled=true;result.textContent='파일을 등록하고 있습니다…';
 try{
 const body={name:file.name,mime:file.type,size:file.size,alt:form.querySelector('[name="alt"]')?.value||'',expectedVersion:form.querySelector('[name="expectedVersion"]').value,requestId:crypto.randomUUID()},csrf=form.querySelector('[name="csrf"]').value;
 const permit=await fetch(form.dataset.upload,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});const data=await permit.json();if(!permit.ok)throw Error(data.error||'파일 등록을 준비하지 못했습니다.');
 const upload=await fetch(data.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type,'X-CSRF-Token':csrf,'X-Upload-Token':data.uploadToken},body:file});const outcome=await upload.json();if(!upload.ok)throw Error(outcome.error||'업로드하지 못했습니다.');location.reload();
 }catch(error){result.textContent=error.message;}finally{button.disabled=false;}
});

document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('form[data-auth-start]'))return;event.preventDefault();
 const button=form.querySelector('button'),result=form.querySelector('.form-result');button.disabled=true;result.textContent='로그인 서비스로 이동합니다…';
 try{const response=await fetch(form.action,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams(new FormData(form))});const payload=await response.json();if(!response.ok)throw Error(payload.error||'로그인을 시작하지 못했습니다.');const url=new URL(payload.authorizationUrl);if(url.protocol!=='https:')throw Error('로그인 설정을 확인해주세요.');location.assign(url.href);}
 catch(error){result.textContent=error.message;button.disabled=false;}
});
