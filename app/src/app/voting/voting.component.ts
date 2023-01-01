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
    // TODO this is temp, displayedHouses, columns and data will be set in setData()
    this.setData()
    this.setDisplayedHouses()
    console.log("houses", typeof(this.displayedHouses), this.displayedHouses)
    this.setDisplayedColumns()
    console.log("columns", typeof(this.displayedColumns), this.displayedColumns)
    console.log("\nright", this.votingRights.pipe(take(1)))
    // TODO maybe change resultsShown to showResults also elsewhere as it sounds better
    this.db.object("landsraad/votingConfig/resultsShown").valueChanges().subscribe((value: boolean) => {
      this.showResults = value
      if (this.showResults) {
        console.log("set data")
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
      this.db.list("landsraad/answers/"+this.questionId).snapshotChanges(),
      this.db.list("landsraad/votingRights").snapshotChanges(),
      (votes, answers, votingRights) => {
        return { votes: votes, answers: answers, votingRights: votingRights }
      }
    ).pipe(
      take(1),
      tap(
        combined => {
          let data = combined.answers.map(answerSnap => {
            let answerName = answerSnap.payload.val()["name"]
            let answerId = answerSnap.key
            let row = [answerName]
            combined.votingRights.forEach(votingRightSnap => {
              let votingRightId = votingRightSnap.key
              row.push(findVote(combined.votes, votingRightId, answerId))
              console.log("findVote", findVote(combined.votes, votingRightId, answerId))
            })
            return row
          })
          let headers = ["Odpověď"]
          combined.votingRights.forEach(votingRightSnap => {
            headers.push(votingRightSnap.payload.val()["name"])
          })
          let options = {
            headers: headers
          };
          console.log("combined")
          console.log(combined)
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

  setDisplayedHouses() {
    this.displayedHouses = ["Yuzovka", "Fenring", "Atreides"]
  }

  setDisplayedColumns() {
    let columns = this.displayedHouses.slice()
    columns.unshift("dekret")
    columns.push("total")
    this.displayedColumns = columns
  }

}

// TODO taken from swiss/src/app/question-form/question-form.components.ts -> should be refactored to common
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

export interface TableRow {
  dekret: string;
  total: number;
  [key: string]: string | number;
}
