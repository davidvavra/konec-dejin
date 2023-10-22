import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { ValueName, QUESTION_TYPE_HLAS_LANDSRAADU } from '../../../../common/config';

@Component({
  selector: 'app-landsraad',
  templateUrl: './landsraad.component.html',
  styleUrls: ['./landsraad.component.css']
})
export class LandsraadComponent implements OnInit {

  delegates: Observable<ValueName[]>
  votingRightPaths: Observable<string[]>
  questionPaths: Observable<string[]>
  questions: Observable<ValueName[]>
  currentQuestion: Observable<string>
  alreadyVotedCount: Observable<number>
  maxVotedCount: Observable<number>
  resultsShown: Observable<boolean>

  constructor(public db: AngularFireDatabase) { }

  ngOnInit() {
    this.delegates = this.db.list("delegates").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          }).concat({ value: "", name: "- Nikdo -" })
        })
    )
    this.votingRightPaths = this.db.list("landsraad/votingRights", ref => ref.orderByChild("name")).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "landsraad/votingRights/" + snapshot.key)
        })
    )
    this.questionPaths = this.db.list("landsraad/questions").snapshotChanges().pipe(
      map(
        snapshots => {
          let snapshotsFiltered = snapshots.filter(snap => {
            const question = snap.payload.val()
            // as we now have to fill-in DB object even if no question is selected, filter out "no selected" question
            return question["questionType"] !== ""
          })
          return snapshotsFiltered.map(snapshot => "landsraad/questions/" + snapshot.key)
        })
    )
    this.questions = this.db.list("landsraad/questions").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots
          .filter(snapshot => snapshot.payload.val()["questionType"] !== "")
          .map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          }).concat({ value: "", name: "- Žádná -" })
        })
    )
    this.currentQuestion = this.db.object("landsraad/currentQuestion").valueChanges() as Observable<string>
    this.alreadyVotedCount = (this.db.object("landsraad/currentQuestion").valueChanges() as Observable<string>).pipe(flatMap((currentQuestionId, _) => {
      return this.db.list("landsraad/votes/" + currentQuestionId).snapshotChanges().pipe(
        map(snaps => snaps.length)
      )
    }))
    this.maxVotedCount = this.votingRightPaths.pipe(map(items => items.length))
    this.resultsShown = this.db.object("landsraad/votingConfig/resultsShown").valueChanges() as Observable<boolean>
  }

  addVotingRight(form: NgForm) {
    if (form.valid) {
      this.db.list("landsraad/votingRights").push({
        name: form.value["name"],
        votes: form.value["votes"],
        controlledBy: form.value["controlledBy"]
      })
    }
  }

  addQuestion(form: NgForm) {
    if (form.valid) {
      let ref = this.db.list("landsraad/questions").push({
        questionType: QUESTION_TYPE_HLAS_LANDSRAADU["value"],
        name: form.value["name"]
      });
      (form.value["answers"] as string).split(",").forEach(
        answer => {
          this.db.list("landsraad/answers/" + ref.key).push({
            name: answer.trim()
          });
        }
      )
    }
  }

  currentQuestionChanged(event) {
    this.db.object("landsraad/currentQuestion").set(event.value)
  }

  toggleVotingCheckbox(event) {
    this.resultsShown = event.checked
    this.db.object("landsraad/votingConfig/resultsShown").set(event.checked)
  }
}