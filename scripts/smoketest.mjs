#!/usr/bin/env node
const url='http://localhost:5000/api/auth/register';
const body={name:'smoketest', email:`smoketest_${Date.now()}@example.com`, password:'SmokePass123'};
(async()=>{
  try{
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();
    console.log('STATUS',res.status);
    console.log(JSON.stringify(data,null,2));
  }catch(e){
    console.error('ERROR',e.message || e);
    process.exit(1);
  }
})();
