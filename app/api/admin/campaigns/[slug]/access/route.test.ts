import {beforeEach,describe,expect,it,vi} from 'vitest';

const state={existing:null as Record<string,unknown>|null,upserted:null as Record<string,unknown>|null};

function table(name:string){
 const builder:any={
  select:()=>builder,
  eq:()=>builder,
  maybeSingle:async()=>name==='campaigns'?{data:{id:'c1',slug:'s',name:'Spain'},error:null}:{data:state.existing,error:null},
  upsert:(row:Record<string,unknown>)=>{state.upserted=row;return builder},
  single:async()=>({data:{provider:'FUNCROWD',invitation_code:null,launch_url:null,android_launch_url:null,ios_launch_url:null,reveal_state:'READY',updated_at:'now'},error:null}),
  insert:async()=>({error:null})
 };
 return builder;
}

vi.mock('../../../../../../lib/admin-server',()=>({
 requireAdmin:async()=>({user:{id:'u1'},role:'SUPER_ADMIN',db:{from:(name:string)=>table(name)}})
}));

import {PATCH} from './route';

const call=(body:Record<string,unknown>)=>PATCH(
 new Request('http://test/api/admin/campaigns/s/access',{method:'PATCH',body:JSON.stringify(body)}) as never,
 {params:Promise.resolve({slug:'s'})}
);

describe('PATCH campaign access',()=>{
 beforeEach(()=>{state.upserted=null;state.existing={invitation_code:null,launch_url:null,android_launch_url:'https://android.example/app',ios_launch_url:'https://ios.example/app'}});

 it('keeps stored mobile launch URLs when the form omits them',async()=>{
  const res=await call({provider:'funcrowd',invitationCode:'abc123',launchUrl:'',revealState:'READY'});
  expect(res.status).toBe(200);
  expect(state.upserted).toMatchObject({invitation_code:'ABC123',launch_url:null,android_launch_url:'https://android.example/app',ios_launch_url:'https://ios.example/app'});
 });

 it('clears a field only when it is sent as an empty string',async()=>{
  await call({provider:'funcrowd',androidLaunchUrl:'',revealState:'READY'});
  expect(state.upserted).toMatchObject({android_launch_url:null,ios_launch_url:'https://ios.example/app'});
 });
});
