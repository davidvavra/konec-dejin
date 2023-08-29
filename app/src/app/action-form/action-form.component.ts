import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { COUNTRIES, VISIBILITIES, ACTION_TYPES, VISIBILITIES_PRIMARY, ValueName } from '../../../../common/config';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { MatDialog } from '@angular/material/dialog';
import { map, take, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { JsonpClientBackend } from '@angular/common/http';

@Component({
  selector: 'app-action-form',
  templateUrl: './action-form.component.html',
  styleUrls: ['./action-form.component.css']
})
export class ActionFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private auth: AngularFireAuth, private dialog: MatDialog) { }

  actionForm: FormGroup;

  state: string;

  countries = COUNTRIES
  secondaryVisibilities = VISIBILITIES
  primaryVisibilities = VISIBILITIES_PRIMARY
  actionTypes = ACTION_TYPES
  projectCondition = null
  projectBenefit = null

  @Input()
  path: string

  missions: Observable<ValueName[]>
  units: Observable<ValueName[]>

  ngOnInit() {
    this.actionForm = this.fb.group({
      description: [''],
      df: [0],
      title: [''],
      keyword: [''],
      targetCountry: [''],
      type: [''],
      identifier: ['']
    })
    let delegateId = this.auth.auth.currentUser.uid
    this.missions = this.db.list("projects", ref => ref.orderByChild("enabled").equalTo(true)).valueChanges().pipe(
      map(
        projects => {
          let delegateProjects = projects.filter(project => project["type"] == "delegate" && project["delegate"] == delegateId).sort((a, b) => {
            if(a["keyword"] < b["keyword"]) { return -1; }
            if(a["keyword"] > b["keyword"]) { return 1; }
            return 0;
          })
          let formattedProjects = delegateProjects.map(project => {
            return { value: project["keyword"], name: project["name"]+" ("+project["keyword"]+")" }
          })
          formattedProjects.push({ value: "", name: "- Žádná -" })
          return formattedProjects
        }
      )
    )
    this.units = this.db.list("units", ref => ref.orderByChild("delegate").equalTo(delegateId)).snapshotChanges().pipe(
      map(
        units => {
          let delegateUnits = units.filter(snap => {
            let unit = snap.payload.val()
            return unit["delegate"] == delegateId && (unit["type"] == "active_hero" || unit["type"] == "army") && unit["state"] == "alive"
          }).map(unit => {
            return { value: unit.key, name: unit.payload.val()["name"] }
          })
          delegateUnits.push({ value: "", name: "- Žádná -" })
          return delegateUnits
        }
      )
    )
  }

  changeHandler(e) {
    let names = {
      'loading': "Načítání…",
      'modified': "Ukládání…",
      'synced': "Uloženo",
      'error': "Chyba ukládání!"
    }
    this.state = names[e]
  }

  dfChanged(e) {
    let newDf = e.target.value
    if (newDf > 4) {
      this.actionForm.controls.df.setValue(4)
    }
    if (newDf < 0) {
      this.actionForm.controls.df.setValue(0)
    }
  }

  missionChanged(e) {
    let keyword = e.value
    let delegateId = this.auth.auth.currentUser.uid
    this.db.list("projects", ref => ref.orderByChild("enabled").equalTo(true)).valueChanges().pipe(
      take(1),
      tap(missions => {
        let mission = missions.find(project => project["type"] == "delegate" && project["delegate"] == delegateId && project["keyword"] == keyword)
        if (mission != null) {
          this.actionForm.controls.df.setValue(mission["df"])
          this.projectCondition = mission["condition"]
          this.projectBenefit = mission["benefit"]
        }
      })
    ).subscribe()
  }

  delete() {
    this.db.object(this.path).remove()
  }
}

