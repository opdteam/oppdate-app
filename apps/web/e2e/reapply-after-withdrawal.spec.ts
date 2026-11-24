import { test, expect } from '@playwright/test'
import { getTestUser, getFirstOpportunity, apiPost, apiGet } from './helpers'

test.describe('Reapply after withdrawal', () => {
  test('creates a new application record after withdrawing and reapplying', async ({ request }) => {
    const user = await getTestUser(request)
    const opp = await getFirstOpportunity(request)

    // 1. Start the apply flow
    const startRes = await apiPost(request, '/applications/start', user.token, {
      opportunityId: opp.id,
    })
    expect(startRes.ok()).toBe(true)
    const startData = (await startRes.json()).data
    expect(startData.resumed).toBeFalsy()

    // 2. Submit (creates the application record)
    const submitRes = await apiPost(request, '/applications/submit', user.token, {
      opportunityId: opp.id,
      eligibilityResponses: [],
      documentSlots: [],
    })
    expect(submitRes.ok()).toBe(true)
    const submitData = (await submitRes.json()).data
    const firstAppId = submitData.applicationId
    expect(firstAppId).toBeTruthy()
    expect(submitData.status).toBe('awaiting_payment')

    // 3. Withdraw
    const withdrawRes = await apiPost(request, `/applications/${firstAppId}/withdraw`, user.token)
    expect(withdrawRes.ok()).toBe(true)
    const withdrawData = (await withdrawRes.json()).data
    expect(withdrawData.status).toBe('withdrawn')

    // 4. Start again -- should NOT return the withdrawn app
    const start2Res = await apiPost(request, '/applications/start', user.token, {
      opportunityId: opp.id,
    })
    expect(start2Res.ok()).toBe(true)
    const start2Data = (await start2Res.json()).data
    expect(start2Data.resumed).toBeFalsy()
    expect(start2Data.applicationId).toBeUndefined()

    // 5. Submit again -- should create a NEW record
    const submit2Res = await apiPost(request, '/applications/submit', user.token, {
      opportunityId: opp.id,
      eligibilityResponses: [],
      documentSlots: [],
    })
    expect(submit2Res.ok()).toBe(true)
    const submit2Data = (await submit2Res.json()).data
    const secondAppId = submit2Data.applicationId
    expect(secondAppId).toBeTruthy()
    expect(submit2Data.status).toBe('awaiting_payment')

    // The new application must have a DIFFERENT ID from the first
    expect(secondAppId).not.toBe(firstAppId)

    // 6. Verify both exist: first is withdrawn, second is awaiting_payment
    const app1Res = await apiGet(request, `/applications/${firstAppId}`, user.token)
    expect(app1Res.ok()).toBe(true)
    expect((await app1Res.json()).data.status).toBe('withdrawn')

    const app2Res = await apiGet(request, `/applications/${secondAppId}`, user.token)
    expect(app2Res.ok()).toBe(true)
    expect((await app2Res.json()).data.status).toBe('awaiting_payment')

    // 7. Clean up: withdraw the second app too
    await apiPost(request, `/applications/${secondAppId}/withdraw`, user.token)
  })

  test('auto-withdraws stale awaiting_payment apps on resubmit', async ({ request }) => {
    const user = await getTestUser(request)
    const opp = await getFirstOpportunity(request)

    // Create an application and leave it in awaiting_payment (simulating an abandoned attempt)
    const sub1 = await apiPost(request, '/applications/submit', user.token, {
      opportunityId: opp.id,
      eligibilityResponses: [],
      documentSlots: [],
    })
    // This may return resumed:true from the previous test's second app -- withdraw it first
    const sub1Data = (await sub1.json()).data
    if (sub1Data.resumed) {
      await apiPost(request, `/applications/${sub1Data.applicationId}/withdraw`, user.token)
    }

    // Now create a fresh one
    const freshRes = await apiPost(request, '/applications/submit', user.token, {
      opportunityId: opp.id,
      eligibilityResponses: [],
      documentSlots: [],
    })
    const freshData = (await freshRes.json()).data
    const staleId = freshData.applicationId
    expect(staleId).toBeTruthy()
    expect(freshData.status).toBe('awaiting_payment')

    // Now submit again WITHOUT withdrawing -- the stale app should be auto-withdrawn
    const resubRes = await apiPost(request, '/applications/submit', user.token, {
      opportunityId: opp.id,
      eligibilityResponses: [],
      documentSlots: [],
    })
    expect(resubRes.ok()).toBe(true)
    const resubData = (await resubRes.json()).data
    const newId = resubData.applicationId
    expect(newId).toBeTruthy()
    expect(newId).not.toBe(staleId)
    expect(resubData.status).toBe('awaiting_payment')

    // The stale app should now be withdrawn
    const staleCheck = await apiGet(request, `/applications/${staleId}`, user.token)
    expect(staleCheck.ok()).toBe(true)
    expect((await staleCheck.json()).data.status).toBe('withdrawn')

    // Clean up
    await apiPost(request, `/applications/${newId}/withdraw`, user.token)
  })
})
