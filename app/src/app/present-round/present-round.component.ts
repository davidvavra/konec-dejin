import { Component, OnInit, Input } from '@angular/core';
import { VotingRight, VotingRightWithQuestionPath, Question, QuestionWithDbPath } from '../model';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
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
  markedLandsraadQuestionsAsSent: Observable<boolean>
  controlledVotingRights: Observable<VotingRightWithQuestionPath[]>
  delegateId: string
  delegationId: string
  spentDf = new BehaviorSubject<number>(0)
  roundIsSmall: boolean

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
    this.markedLandsraadQuestionsAsSent = this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedLandsraadQuestionsAsSent").valueChanges().pipe(
      map(val => {
        return val as boolean
      })
    )
    this.db.list("landsraad/rounds").snapshotChanges().pipe(
      tap(
        roundsSnapshots => {
          let currentRoundSnapshot = roundsSnapshots.find(roundSnapshot => roundSnapshot.key === this.roundId)
          this.roundIsSmall = currentRoundSnapshot && currentRoundSnapshot.payload.val()["name"].toLowerCase().includes("malé")
        }
      )
    ).subscribe()
    this.controlledVotingRights = combineLatest(
      this.db.list("landsraad/votingRights", ref => ref.orderByChild("controlledBy").equalTo(this.delegateId)).snapshotChanges(),
      this.db.list("landsraad/questions/", ref => ref.orderByChild("byDelegateId").equalTo(this.delegateId)).snapshotChanges(),
      (votingRightsSnapshots, questionsSnapshots) => {
        let questions: QuestionWithDbPath[] = questionsSnapshots.map(
          snapshot => {
          let question = snapshot.payload.val() as Question
          return {
            ...question,
            dbPath: `landsraad/questions/${snapshot.key}`
          }
        })
        let votingRightsPath: VotingRightWithQuestionPath[] = votingRightsSnapshots.map(
          (votingRightSnapshot) => {
            let votingRight = votingRightSnapshot.payload.val() as VotingRight
            let questionForVotingRight = questions.find(
              question => {
                return question["byVotingRightId"] === votingRightSnapshot.key && question["roundId"] === this.roundId
              })
            if (questionForVotingRight) {
              return {
                ...votingRight,
                dbPath: questionForVotingRight.dbPath
              }
            }
          }
        )
        return votingRightsPath
      }
    )
  }

  send() {
    this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedAsSent").set(true)
  }

  sendQuestion() {
    this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/markedLandsraadQuestionsAsSent").set(true)
  }
}