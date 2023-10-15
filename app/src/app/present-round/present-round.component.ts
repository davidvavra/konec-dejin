import { Component, OnInit, Input } from '@angular/core';
import { AvailableQuestion, VotingRightWithPath } from '../model';
import { Observable, BehaviorSubject } from 'rxjs';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { map, flatMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-present-round',
  templateUrl: './present-round.component.html',
  styleUrls: ['./present-round.component.css']
})
export class PresentRoundComponent implements OnInit {

  constructor(public db: AngularFireDatabase, public auth: AngularFireAuth) {
    this.delegateId = this.auth.auth.currentUser.uid
  }

  @Input()
  roundId: string

  primaryActionPaths: Observable<string[]>
  markedAsSent: Observable<boolean>
  markedDecreeAsSent: Observable<boolean>
  availableQuestions: AvailableQuestion[]
  controlledVotingRights: Observable<VotingRightWithPath[]>
  delegateId: string
  delegationId: string
  spentDf = new BehaviorSubject<number>(0)

  ngOnInit() {
    let delegateActions = this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/delegation").valueChanges().pipe(
      flatMap((delegationId, _) => {
        this.delegationId = delegationId as string
        return this.db.list("actions/" + this.roundId, ref => ref.orderByChild("delegate").equalTo(this.delegateId)).snapshotChanges().pipe(tap(
          snaps => {
            let spentDf = snaps.map(snap => snap.payload.val()["df"] || 0).reduce((sum, current) => sum + current)
            this.spentDf.next(spentDf)
          }
        ))
      })
    )
    this.primaryActionPaths = delegateActions.pipe(map(snapshots => {
      return snapshots.filter(snapshot => snapshot.payload.val()["type"] == "mission" || snapshot.payload.val()["type"] == "other" || snapshot.payload.val()["type"] == "unit").map(snapshot => "actions/" + this.roundId + "/" + snapshot.key)
    }))
    this.markedAsSent = this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedAsSent").valueChanges().pipe(
      map(val => {
        return val as boolean
      })
    )
    this.markedDecreeAsSent = this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedDecreeAsSent").valueChanges().pipe(
      map(val => {
        return val as boolean
      })
    )
    this.db.list("landsraad/questions").snapshotChanges().pipe(
      tap(
        questionsSnapshots => {
          this.availableQuestions = questionsSnapshots.map(qSnapshot => {
            const question: any = qSnapshot.payload.val()
            const qKey = qSnapshot.key
            return {
              ...question,
              id: qKey
            }
          })
        }
      )
    ).subscribe(ref => this.controlledVotingRights = this.db.list("landsraad/votingRights", ref => ref.orderByChild("controlledBy").equalTo(this.delegateId)).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            let value = snapshot.payload.val()
            let existingQuestions = this.availableQuestions.filter(q => {
              // check if there is existing question for this round, delegate, house 
              // and not of the type "Bill of Particulars" (because that one is extra)
              // we will use the same path if it exists
              return q["byDelegateId"] === this.delegateId && q["byHouse"] === value["name"] && q["roundId"] === this.roundId && q["decretType"] !== "Bill of Particulars"
            })
            let path: string
              if (existingQuestions.length > 0) {
                // there should be only one and if there is more, we don't care which one we overwrite
              path = `landsraad/questions/${existingQuestions[0].id}`
            } else {
              // no existing question, so we need to generate Id for the path
              let ref = this.db.list("landsraad/questions").push({
                decretType: "- Žádný -",
                name: "",
                byDelegateId: this.delegateId,
                byHouse: value["name"],
                roundId: this.roundId,
                hidden: false
              })
              path = `landsraad/questions/${ref.key}`
              const answers = ["ANO", "NE"]
              answers.forEach(
                answer => {
                  let ref_a = this.db.list("landsraad/answers/" + ref.key).push({
                    name: answer.trim()
                  })
              })
            }
            return { id: snapshot.key, name: value["name"], votes: value["votes"], dbPath: path }
          })
        })
    ))
  }

  send() {
    this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedAsSent").set(true)
  }

  sendDecree() {
    this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedDecreeAsSent").set(true)
  }
}