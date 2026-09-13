const cfg=window.SLS_CONFIG||{};
document.getElementById('year').textContent=new Date().getFullYear();
const menu=document.querySelector('.menu-btn'); const nav=document.getElementById('mainNav');
menu?.addEventListener('click',()=>nav.classList.toggle('open'));
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

document.querySelectorAll('.product-enquire').forEach(b=>b.addEventListener('click',()=>{document.getElementById('productSelect').value=b.dataset.product;document.getElementById('enquiry').scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('.service-enquire').forEach(b=>b.addEventListener('click',()=>{document.getElementById('serviceSelect').value=b.dataset.service;document.getElementById('service-request').scrollIntoView({behavior:'smooth'});}));

async function saveToSupabase(payload,file){
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY) return false;
  let attachment_url='';
  const headers={apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`};
  if(file){
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=`${Date.now()}-${safe}`;
    const r=await fetch(`${cfg.SUPABASE_URL}/storage/v1/object/service-attachments/${path}`,{method:'POST',headers:{...headers,'Content-Type':file.type||'application/octet-stream'},body:file});
    if(!r.ok) throw new Error('Attachment upload failed');
    attachment_url=path;
  }
  const r=await fetch(`${cfg.SUPABASE_URL}/rest/v1/enquiries`,{method:'POST',headers:{...headers,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({...payload,attachment_path:attachment_url,status:payload.status||'new'})});
  if(!r.ok) throw new Error('Could not save enquiry');
  return true;
}
function mailFallback(data,fileName=''){
  const subject=encodeURIComponent(`${data.type==='service'?'Service Request':'Product Enquiry'} - ${data.subject||'Sri Laxmi Sai Scientific Services'}`);
  const body=encodeURIComponent(`Name: ${data.name||''}\nCompany: ${data.company||''}\nPhone: ${data.phone||''}\nEmail: ${data.email||''}\nLocation: ${data.location||''}\nInstrument: ${data.instrument||''}\nProduct/Service: ${data.subject||''}\nRequirement: ${data.message||''}\nAttachment selected: ${fileName||'None'}\n\nSent from website enquiry form.`);
  window.location.href=`mailto:${cfg.NOTIFY_EMAIL||'saiscientific.dhaara@gmail.com'}?subject=${subject}&body=${body}`;
}
async function handleForm(form,statusId){
  const status=document.getElementById(statusId); status.textContent='Submitting…';
  const data=Object.fromEntries(new FormData(form).entries()); const file=form.querySelector('input[type=file]')?.files?.[0];
  try{const saved=await saveToSupabase(data,file); if(!saved) mailFallback(data,file?.name); status.textContent=saved?'Submitted successfully. Our team can view this in the admin panel.':'Your email app has been opened with the enquiry details. Please press Send.'; form.reset();}
  catch(e){status.textContent='Could not save online. Opening email fallback…'; mailFallback(data,file?.name);}
}
document.getElementById('enquiryForm').addEventListener('submit',e=>{e.preventDefault();handleForm(e.currentTarget,'enquiryStatus')});
document.getElementById('serviceForm').addEventListener('submit',e=>{e.preventDefault();handleForm(e.currentTarget,'serviceStatus')});
