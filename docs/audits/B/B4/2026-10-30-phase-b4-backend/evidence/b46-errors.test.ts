/* Deterministic adapter tests. No real DB/provider; not persistence evidence. */
import { describe,it,expect,vi,afterEach } from 'vitest';
import { api,databaseError } from '@/lib/server/api';
import { api as clientApi } from '@/lib/client/api';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('B4.6 error semantic boundary',()=>{
 it('B46-01 SQL42702 ambiguity becomes an unrelated catalogue conflict',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const response=await api('audit.ent.consent',async()=>databaseError({code:'42702',message:'column reference "e.body" is ambiguous'}));
  const body=await response.json();expect(response.status).toBe(409);expect(body.code).toBe('AMBIGUOUS_PRODUCT');expect(body.error).toContain('apelido');
  expect(body.error).not.toContain('e.body');expect(JSON.stringify(log.mock.calls)).not.toContain('e.body');
 });
 it('B46-02 unrelated stale conflict inherits the inventory recovery action',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  const response=await api('audit.conflict',async()=>databaseError({code:'40001',message:'concurrent update detected'}));
  const body=await response.json();expect(response.status).toBe(409);expect(body.code).toBe('INVENTORY_CONFLICT');expect(body.error).toContain('contagem');
 });
 it('B46-03 invitation and expired Flow are classified by same substring',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  const response=await api('audit.flow',async()=>databaseError({code:'P0001',message:'flow session expired'}));
  expect((await response.json()).code).toBe('INVITATION_INVALID');
 });
 it('B46-04 unknown SQL failure remains safe and correlated',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const response=await api('audit.safe',async()=>databaseError({code:'XX000',message:'PRIVATE_SENTINEL SQL text'}));
  const body=await response.json();expect(response.status).toBe(503);expect(body.code).toBe('DATABASE_UNAVAILABLE');expect(body.correlationId).toBe(response.headers.get('x-correlation-id'));expect(JSON.stringify(body)).not.toContain('PRIVATE_SENTINEL');expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_SENTINEL');
 });
 it('B46-05 JSON client treats a successful 204 as invalid response',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:204})));
  await expect(clientApi('/api/synthetic-204')).rejects.toThrow('resposta válida');
 });
 it('B46-06 JSON client loses recommendedAction and retryable from the safe envelope',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:'RECONCILIATION_REQUIRED',error:'Reconciliar resultado.',recommendedAction:'CHECK_PROVIDER',retryable:false,correlationId:'synthetic-reference'},{status:409})));
  try{await clientApi('/api/synthetic');throw new Error('Expected rejection');}catch(error){expect(error).toMatchObject({status:409,code:'RECONCILIATION_REQUIRED'});expect(error).not.toHaveProperty('recommendedAction');expect(error).not.toHaveProperty('retryable');}
 });
 it('B46-07 plain response and lost JSON are not proof of rollback',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('upstream unavailable',{status:502})));
  await expect(clientApi('/api/synthetic',{idempotencyKey:'stable'})).rejects.toThrow('Tente novamente');
 });
 it('B46-08 actual Flow SQLSTATE42501 overrides the expiry substring',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  const response=await api('audit.flow.counterproof',async()=>databaseError({code:'42501',message:'flow session expired'}));
  expect(response.status).toBe(403);expect((await response.json()).code).toBe('FORBIDDEN');
 });
});
