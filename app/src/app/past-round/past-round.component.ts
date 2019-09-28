import { Component, OnInit, Input } from '@angular/core';
import { Action, SelectRow } from '../model';
import { COUNTRIES, ACTION_TYPES, VISIBILITIES } from "../config"
import { Observable } from 'rxjs';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { flatMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-past-round',
  templateUrl: './past-round.component.html',
  styleUrls: ['./past-round.component.css']
})
export class PastRoundComponent implements OnInit {

  constructor(public db: AngularFireDatabase, public auth: AngularFireAuth) {
    this.delegateId = this.auth.auth.currentUser.uid
  }

  @Input()
  roundId: string

  delegateId: string
  primaryActions: Observable<Action[]>
  secondaryActions: Observable<Action[]>

  ngOnInit() {
    let delegationActions = this.db.object("delegateRounds/" + this.delegateId + "/" + this.roundId + "/delegation").valueChanges().pipe(
      flatMap((delegationId, _) => {
        return this.db.list("actions/" + this.roundId, ref => ref.orderByChild("delegation").equalTo(delegationId as string)).valueChanges()
      })
    )
    this.primaryActions = delegationActions.pipe(map(actions => {
      return actions.filter(action => action["type"] == "main").map(action => action as Action)
    }))
    this.secondaryActions = delegationActions.pipe(map(actions => {
      return actions.filter(action => action["type"] != "main").map(action => action as Action)
    }))
  }

  formatDoneActionDescription(action: Action) {
    let description = action.description
    if (!isBlank(action.keyword)) {
      description += " (" + action.keyword + ")"
    }
    return description
  }

  formatDoneActionDetails(action: Action) {
    let details = findRowName(COUNTRIES, action.targetCountry) + ", "
    if (action.df > 0) {
      details += action.df + " DF, "
    }
    if (action.type != "main") {
      details += findRowName(ACTION_TYPES, action.type) + ", "
    }
    details += findRowName(VISIBILITIES, action.visibility) + ", "
    return details
  }

}

function isBlank(str) {
  return (!str || /^\s*$/.test(str));
}

function findRowName(rows: SelectRow[], value: string) {
  return rows.find((row) => row.value == value).name
}
