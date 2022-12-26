import { Component, Input, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireDatabase } from '@angular/fire/database';
import { NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
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
    // TODO maybe change resultsShown to showResults also elsewhere as it sounds better
    this.db.object("landsraad/votingConfig/resultsShown").valueChanges().subscribe((value: boolean) => {
      this.showResults = value
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

}

interface VotingRight {
  id: string,
  name: string,
  votes: number
}
