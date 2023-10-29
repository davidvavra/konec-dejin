import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { doLogin, doSwissLogin } from './login';
import { doProcessDelegationChange, doProcessBvChange } from './database';

// TODO parameterize URL and region, maybe using process.env.GCLOUD_PROJECT
admin.initializeApp({
    databaseURL: "https://dune-new-dawn-test-default-rtdb.europe-west1.firebasedatabase.app"
});
console.log("credentials", process.env.GOOGLE_APPLICATION_CREDENTIALS)

export let login = functions
.region("europe-west1")
.https.onRequest(async (request, response) => {
    response = response.set('Access-Control-Allow-Origin', '*')
    await doLogin(request.query["password"] as string, response)
})

export let swissLogin = functions
.region("europe-west1")
.https.onRequest(async (request, response) => {
    response = response.set('Access-Control-Allow-Origin', '*')
    await doSwissLogin(request.query["password"] as string, response)
})

export let processDelegationChange = functions
.region("europe-west1")
.database.ref("delegateRounds/{delegateId}/{roundId}/delegation").onWrite(async (change, context) => {
    await doProcessDelegationChange(context.params.delegateId, context.params.roundId, change)
})

export let processBvChange = functions
.region("europe-west1")
.database.ref("bvRounds/{roundId}/{delegateId}/{changeId}").onWrite(async (change, context) => {
    await doProcessBvChange(context.params.roundId, context.params.delegateId)
})