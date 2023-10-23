import { Component, Input, OnInit } from '@angular/core';
import { AngularFireAction, AngularFireDatabase, DatabaseSnapshot } from '@angular/fire/database';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { ngxCsv } from 'ngx-csv';
import { combineLatest, Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { ValueName } from '../../../../common/config';
import { ALL_QUESTIONS, QUESTION_TYPE_HLAS_LANDSRAADU } from '../../../../common/config';

@Component({
  selector: 'app-question-form',
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.css']
})
export class QuestionFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private dialog: MatDialog) { }

  questionForm: FormGroup;
  state: string;
  questionId: string;

  @Input()
  path: string

  @Input()
  delegates: Observable<ValueName[]>

  @Input()
  rounds: Observable<ValueName[]>

  @Input()
  votingRights: Observable<ValueName[]>

  delegateName: string
  roundName: string
  votingRightName: string
  questionTypeFormatted: string

  answerPaths: Observable<string[]>

  ngOnInit() {
    ALL_QUESTIONS.push(QUESTION_TYPE_HLAS_LANDSRAADU)
    this.db.object(this.path).valueChanges().pipe().subscribe(question => console.log("question", question))
    this.questionForm = this.fb.group({
      name: [''],
    })
    let paths = this.path.split("/")
    this.questionId = paths[2]
    this.answerPaths = this.db.list("landsraad/answers/" + this.questionId).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "landsraad/answers/" + this.questionId + "/" + snapshot.key)
        })
    )
    this.db.object(this.path).valueChanges().pipe(
      tap(
        question => {
          let questionDef = ALL_QUESTIONS.find(q => q["value"] === question["questionType"])
          this.questionTypeFormatted = questionDef && questionDef["name"]
          this.delegates.pipe().subscribe(delegates => {
            let delegate = delegates.find(delegate => delegate["value"] === question["byDelegateId"])
            this.delegateName = delegate && delegate["name"]
          })
          this.votingRights.pipe().subscribe(rights => {
            console.log("rights", rights)
            console.log(question["byVotingRightId"])
            let right = rights.find(right => right["value"] === question["byVotingRightId"])
            console.log("right", right)
            this.votingRightName = right && right["name"]
          })
          this.rounds.pipe().subscribe(rounds => {
            let round = rounds.find(round => round["value"] === question["roundId"])
            this.roundName = round && round["name"]
          })
        }
      )
    ).subscribe()

  }

  changeHandler(state) {
    this.state = state
  }

  delete() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: this.questionForm.controls.name.value }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.object("landsraad/answers/"+this.questionId).remove();
          this.db.object("landsraad/votes/"+this.questionId).remove();
          this.db.object(this.path).remove()
        }
      })
  }

  export() {
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
          new ngxCsv(data, 'Export hlasů: '+this.questionForm.get("name").value, options);
        }
      )
    ).subscribe()
  }

}

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