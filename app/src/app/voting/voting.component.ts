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
  displayedHouses: string[]

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
        this.subscribeToVotingResults()
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
    this.db.object("landsraad/votingConfig/resultsShown").valueChanges().subscribe((value: boolean) => {
      this.showResults = value
      if (this.showResults) {
        this.subscribeToVotingResults()
    
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

  subscribeToVotingResults() {
    combineLatest(
      this.db.list("landsraad/votes/" + this.questionId).snapshotChanges(),
      this.db.list("landsraad/answers/" + this.questionId).snapshotChanges(),
      this.db.list("landsraad/votingRights").snapshotChanges(),
      (votes, answers, votingRights) => {
        return { 
          votes: votes, answers: answers, votingRights: votingRights}
      }
    ).pipe(
      tap(
        combined => {
          // current question answers ids to names
          let currentQuestionAnswersMap: GenericFirebaseSnapshotMapping = {}
          combined.answers.forEach((row) => {
              currentQuestionAnswersMap[row.key] = row.payload.val()["name"]
          })
          // check if we have some current question answers, if not set empty data and return
          if (Object.values(currentQuestionAnswersMap).filter(answer => answer !== undefined).length === 0) {
            this.setData(null, [])
            return
          }
          // voting rights ids to house names
          let votingRightToHouseMap: GenericFirebaseSnapshotMapping = {}
          combined.votingRights.forEach(votingRightSnap => {
            // take in only the first part of the name, houses with more delegates will have same house name for each delegate
            // this is used later when matching votes by house name (for example for Atreides and Harkonnens)
            votingRightToHouseMap[votingRightSnap.key] = votingRightSnap.payload.val()["name"].split(" ")[0]
          })
          // votes per house
          let votesByHouse: VoteByHouse = {}
          let finalData: TableRow[] = [...Object.values(currentQuestionAnswersMap).map(answer => ({dekret: answer}))]
          combined.votes.forEach(voteSnap => {
            let answer = voteSnap.payload.val()
            let answerId = Object.keys(answer)[0]
            let answerString: string = currentQuestionAnswersMap[answerId]
            let votedBy: string = votingRightToHouseMap[voteSnap.key]
            let votes = answer[answerId]
            let answerIndexInData: number = finalData.findIndex(row => row.dekret === answerString)
            // either create new entry in row or add votes to current
            if (finalData[answerIndexInData].hasOwnProperty(votedBy)) {
              // houses with more voting delegates, add their votes if they answer the same way
              finalData[answerIndexInData][votedBy] = finalData[answerIndexInData][votedBy] + votes
            } else {
              // house with single voting delegate
              finalData[answerIndexInData][votedBy] = votes
            }
            // add total row
            let voteInVotesByHouse = Object.keys(votesByHouse).includes(votedBy)
            if (voteInVotesByHouse) {
              // houses with more voting delegates, add their votes together
              votesByHouse[votedBy] = votesByHouse[votedBy] + votes
            } else {
              // other houses with single voting delegate
              votesByHouse[votedBy] = votes
            }
          })
          // add total per answer
          finalData = finalData.map((row: TableRow) => {
            let total = Object.values(row)
              .map(v => typeof(v) === "number" ? v : 0)
              .reduce((partialSum, a) => partialSum + a, 0)
            return ({...row, total: total})
          })
          // add total for total row
          finalData.push({
            ...votesByHouse, 
            dekret: "Celkem hlasů na rod", 
            total: Object.values(votesByHouse).reduce((partialSum, a) => partialSum + a, 0)})
          this.setData(finalData, [...new Set(Object.values(votingRightToHouseMap))].sort())
        }
      )
    ).subscribe()
  }

  setData(data: TableRow[], displayedHouses: string[]) {
    this.setDisplayedHouses(displayedHouses)
    this.setDisplayedColumns()
    this.setTableData(data)
  }

  setTableData(data: TableRow[]) {
    this.data = data
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

interface VotingRight {
  id: string,
  name: string,
  votes: number
}

interface GenericFirebaseSnapshotMapping {
  [key: string]: string
}

interface VoteByHouse {
  [key: string]: number
}

export interface TableRow {
  dekret: string;
  total?: number;
  [key: string]: string | number;
}
