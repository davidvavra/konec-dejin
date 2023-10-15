import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable, combineLatest, of } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';

@Component({
  selector: 'app-round-delegate-form',
  templateUrl: './round-delegate-form.component.html',
  styleUrls: ['./round-delegate-form.component.css']
})
export class RoundDelegateFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase) { }

  delegateForm: FormGroup;

  state: string;

  @Input()
  path: string

  name: Observable<string>

  delegations: Observable<Delegation[]>

  dfInfo: Observable<DfInfo>

  spentDf: Observable<number>

  ngOnInit() {
    this.delegateForm = this.fb.group({
      delegation: [''],
      mainActions: [0],
      markedAsSent: [false],
      markedDecreeAsSent: [false],
      bv: [0],
      message: ['']
    })
    let paths = this.path.split("/")
    let delegateId = paths[1]
    let roundId = paths[2]
    this.name = this.db.object("delegates/" + delegateId + "/name").valueChanges() as Observable<string>
    this.delegations = this.db.list("delegations").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { id: snapshot.key, name: snapshot.payload.val()["name"] }
          })
        })
    )
    this.dfInfo = this.db.object("delegateRounds/" + delegateId + "/" + roundId).valueChanges().pipe(
      flatMap((delegate, _) => {
        let delegationId = delegate["delegation"];
        if (delegationId == null || delegationId == "") {
          return of({ spentDf: 0, spentState: SpentState.WARNING })
        }
        return this.db.list("actions/" + roundId, ref => ref.orderByChild("delegate").equalTo(delegateId)).snapshotChanges().pipe(map(
          snaps => {
            if (snaps.length == 0) {
              return 0
            }
            return snaps.map(snap => snap.payload.val()["df"] || 0).reduce((sum, current) => sum + current)
          }
        ), map(
          spentDf => {
            let availableDf = delegate["bv"]
            let state = (availableDf == spentDf) ? SpentState.OK : (availableDf > spentDf) ? SpentState.WARNING : SpentState.ERROR
            return { spentDf: spentDf, spentState: state }
          }
        ))
      }
      ))
  }

  changeHandler(state) {
    this.state = state
  }

}


interface Delegation {
  id: string,
  name: string
}

interface DfInfo {
  spentDf: number,
  spentState: SpentState
}

enum SpentState {
  OK = 1, WARNING = 2, ERROR = 3
}
