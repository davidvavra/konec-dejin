import { Component, Input, OnInit } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ValueName, BooleanInputs, booleans } from '../../../../common/config';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';

@Component({
  selector: 'app-voting-right-form',
  templateUrl: './voting-right-form.component.html',
  styleUrls: ['./voting-right-form.component.css']
})
export class VotingRightFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private dialog: MatDialog) { }
  
  votingRightForm: FormGroup;

  state: string;

  delegates: Observable<ValueName[]>

  booleans: BooleanInputs[]

  @Input()
  path: string

  ngOnInit() {
    this.votingRightForm = this.fb.group({
      name: [''],
      votes: [0],
      extraMission: [false],
      extraUnit: [false],
      controlledBy: ['']
    })
    this.delegates = this.db.list("delegates").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          }).concat({ value: "", name: "- Nikdo -" })
        })
    )
    this.booleans = booleans
  } 
  
  changeHandler(state) {
    this.state = state
  }

  delete() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: this.votingRightForm.controls.name.value }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.object(this.path).remove()
        }
      })
  }

}
