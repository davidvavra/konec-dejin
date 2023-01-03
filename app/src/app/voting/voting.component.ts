import { Component, Input, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireAction, AngularFireDatabase, DatabaseSnapshot } from '@angular/fire/database';
import { NgForm } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { ValueName } from '../../../../common/config';

@Component({
  selector: 'app-voting',
  templateUrl: './voting.component.html',
  styleUrls: ['./voting.component.css']
})
export class VotingComponent implements OnInit {

  constructor(public db: AngularFireDatabase, private auth: AngularFireAuth) { }

  questionName: Observable<string>
  answers: Observable<ValueName[]>
  votingRights: Observable<VotingRight[]>
  voted = false
  questionId: string
  showResults: boolean
  data: TableRow[]
  displayedColumns: string[]
  displayedHouses: string[]  // all the delegations with voting right to the question

  ngOnInit() {
    this.db.object("landsraad/currentQuestion").valueChanges().pipe(
      tap(currentQuestion => {
        this.questionId = currentQuestion as string
        this.voted = false
        this.questionName = this.db.object("landsraad/questions/" + this.questionId + "/name").valueChanges() as Observable<string>
        this.answers = this.db.list("landsraad/answers/" + this.questionId).snapshotChanges().pipe(
          map(
            snapshots => {
              return snapshots.map(snapshot => {
                return { value: snapshot.key, name: snapshot.payload.val()["name"] }
              })
            })
        )
        this.composeData()
      })
    ).subscribe()
    let delegateId = this.auth.auth.currentUser.uid
    this.votingRights = this.db.list("landsraad/votingRights", ref => ref.orderByChild("controlledBy").equalTo(delegateId)).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            let value = snapshot.payload.val()
            return { id: snapshot.key, name: value["name"], votes: value["votes"] }
          })
        })
    )
    // TODO maybe change resultsShown to showResults also elsewhere as it sounds better
    this.db.object("landsraad/votingConfig/resultsShown").valueChanges().subscribe((value: boolean) => {
      this.showResults = value
      if (this.showResults) {
        // TODO composeAndSetData ?
        this.composeData()
      }
    })
  }

  vote(form: NgForm) {
    if (form.valid) {
      for (const votingRightId in form.controls) {
        let answerId = form.controls[votingRightId].value
        this.db.object("landsraad/votingRights/" + votingRightId + "/votes").valueChanges().pipe(
          take(1),
          map(votes => {
            this.db.object("landsraad/votes/" + this.questionId + "/" + votingRightId).remove()
            this.db.object("landsraad/votes/" + this.questionId + "/" + votingRightId + "/" + answerId).set(votes)
          })
        ).subscribe()
      }
      this.voted = true
    }
  }

  composeData() {
    // TODO this is deprecated, check how to refactor "to pipe to a map"
    combineLatest(
      this.db.list("landsraad/votes/" + this.questionId).snapshotChanges(),
      this.db.list("landsraad/answers/" + this.questionId).snapshotChanges(),
      this.db.list("landsraad/votingRights").snapshotChanges(),
      (votes, answers, votingRights) => {
        return { 
          votes: votes, answers: answers, votingRights: votingRights}
      }
    ).pipe(
      take(1),
      tap(
        combined => {
          // voting right id to house names
          let votingRightToHouseMap: GenericFirebaseSnapshotMapping = {}
          combined.votingRights.forEach(votingRightSnap => {
            votingRightToHouseMap[votingRightSnap.key] = votingRightSnap.payload.val()["name"].split(" ")[0]
          })
          // current question answers Ids to names
          let currentQuestionAnswersMap: GenericFirebaseSnapshotMapping = {}
          combined.answers.forEach((row) => {
              currentQuestionAnswersMap[row.key] = row.payload.val()["name"]
          })
          // votes per house
          let votesToDelegation: VoteToDelegationMap = {}
          combined.votes.forEach(voteSnap => {
            let answer = voteSnap.payload.val()
            let answerId = Object.keys(answer)[0]
            let votedBy = votingRightToHouseMap[voteSnap.key]
            if (Object.keys(votesToDelegation).indexOf(votedBy) === -1) {
              // house not yet in votesToDelegationMap - just add new answer object
              votesToDelegation[votedBy] = [{
                answer: currentQuestionAnswersMap[answerId],
                answerId: answerId,
                votes: answer[answerId]
              }]
            } else {
              // house in the votesToDelegationMap, need to check which answers are present
              let answers = votesToDelegation[votedBy]
              let answerIndex = answers.findIndex(answer => answer.answerId === answerId)
              if (answerIndex === -1) {
                // answer not present - just add the new object
                votesToDelegation[votedBy].push({
                  answer: currentQuestionAnswersMap[answerId],
                  answerId: answerId,
                  votes: answer[answerId]
                })
              } else {
                // answer present add the vote to the existing object
                votesToDelegation[votedBy][answerIndex].votes = answers[answerIndex].votes + answer[answerId]
              }
            }
          })

          // TODO map votesToDelegation into answers and set this into data
          // TODO rename votesToDelegation into votesToHouses
          // TODO check that votesToDelegation is created correctly -> looks like yes
          console.log("vote to delegation", votesToDelegation)
          this.setDisplayedHouses([...new Set(Object.values(votingRightToHouseMap))].sort())
          this.setDisplayedColumns()
          this.setData()
        }
      )
    ).subscribe()
  }

  setData() {
    this.data = [
      {dekret: "This is really loooooooooooooooooooo question", Yuzovka: 6, Fenring: 19, Atreides: 7, total: 32},
      {dekret: "b", Yuzovka: 2, Fenring: 46, Atreides: 5, total: 53},
      {dekret: "c", Yuzovka: 5, Fenring: 6, Atreides: 1, total: 12},
      {dekret: "Celkem hlasů na rod", Yuzovka: 13, Fenring: 71, Atreides: 13, total: 97}
    ];
  }

  setDisplayedHouses(houses: string[]) {
    this.displayedHouses = houses
  }

  setDisplayedColumns() {
    let columns = this.displayedHouses.slice()
    columns.unshift("dekret")
    columns.push("total")
    this.displayedColumns = columns
  }

}

// TODO taken from swiss/src/app/question-form/question-form.components.ts -> should be refactored to common if to be used
function findVote(snapshots: AngularFireAction<DatabaseSnapshot<any>>[], votingRightId: string, answerId: string) {
  let snapshot = snapshots.find((row) => row.key == votingRightId);
  if (snapshot == null) {
    return ""
  }
  let votes = snapshot.payload.val()[answerId]
  if (votes == null) {
    return ""
  }
  return votes
}

interface VotingRight {
  id: string,
  name: string,
  votes: number
}

interface GenericFirebaseSnapshotMapping {
  [key: string]: string
}

interface Answer {
  answer: string
  answerId: string
  votes: number
}

interface VoteToDelegationMap {
  [key: string]: Answer[]
}

export interface TableRow {
  dekret: string;
  total: number;
  [key: string]: string | number;
}
