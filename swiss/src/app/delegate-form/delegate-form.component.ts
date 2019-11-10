import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AngularFireDatabase } from '@angular/fire/database';
import { MatDialog } from '@angular/material';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';

@Component({
  selector: 'app-delegate-form',
  templateUrl: './delegate-form.component.html',
  styleUrls: ['./delegate-form.component.css']
})
export class DelegateFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private dialog: MatDialog) { }

  delegateForm: FormGroup;

  state: string;

  @Input()
  path: string

  ngOnInit() {
    this.delegateForm = this.fb.group({
      name: [''],
      password: ['']
    })
  }

  changeHandler(state) {
    this.state = state
  }

  delete() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: this.delegateForm.controls.name.value }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.object(this.path.replace("delegates", "delegateRounds")).remove()
          this.db.object(this.path).remove()
        }
      })
  }

}
