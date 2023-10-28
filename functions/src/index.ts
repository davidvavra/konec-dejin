import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { doLogin, doSwissLogin } from './login';
import { doProcessDelegationChange, doProcessBvChange } from './database';

// TODO parameterize URL and region, maybe using process.env.GCLOUD_PROJECT
admin.initializeApp({
    databaseURL: process.env.DATABASE_URL
});

export let login = functions
.region(process.env.REGION as string)
.https.onRequest(async (request, response) => {
    await doLogin(request.query["password"] as string, response)
})

export let swissLogin = functions
.region(process.env.REGION as string)
.https.onRequest(async (request, response) => {
    await doSwissLogin(request.query["password"] as string, response)
})

export let processDelegationChange = functions
.region(process.env.REGION as string)
.database.ref("delegateRounds/{delegateId}/{roundId}/delegation").onWrite(async (change, context) => {
    await doProcessDelegationChange(context.params.delegateId, context.params.roundId, change)
})

export let processBvChange = functions
.region(process.env.REGION as string)
.database.ref("bvRounds/{roundId}/{delegateId}/{changeId}").onWrite(async (change, context) => {
    await doProcessBvChange(context.params.roundId, context.params.delegateId)
})