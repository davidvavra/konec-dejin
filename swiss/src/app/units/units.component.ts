import { Component, OnInit } from '@angular/core';
import { AngularFireAction, AngularFireDatabase, DatabaseSnapshot } from '@angular/fire/database';
import { NgForm } from '@angular/forms';
import { combineLatest, Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { UNIT_STATES, UNIT_TYPES, UNIT_VISIBILITIES, ValueName } from '../../../../common/config';
import { Papa } from 'ngx-papaparse';
import { ngxCsv } from 'ngx-csv';

@Component({
  selector: 'app-units',
  templateUrl: './units.component.html',
  styleUrls: ['./units.component.css']
})
export class UnitsComponent implements OnInit {

  delegates: Observable<ValueName[]>
  unitPaths: Observable<string[]>
  delegateId: string
  types = UNIT_TYPES
  states = UNIT_STATES
  visibilities = UNIT_VISIBILITIES

  constructor(public db: AngularFireDatabase) { }

  ngOnInit() {
    this.delegates = this.db.list("delegates").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          })
        })
    )
  }

  delegateChanged(form: NgForm) {
    this.delegateId = form.value["delegate"]
    this.unitPaths = this.db.list("units", ref => ref.orderByChild("delegate").equalTo(this.delegateId)).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "units/" + snapshot.key)
        })
    )
  }

  addUnit(form: NgForm) {
    if (form.valid) {
      this.db.list("units").push({
        name: form.value["name"],
        delegate: form.value["delegate"],
        publicInfo: form.value["publicInfo"],
        delegateInfo: form.value["delegateInfo"],
        internalInfo: form.value["internalInfo"],
        type: form.value["type"],
        state: form.value["state"],
        visibility: form.value["visibility"]
      })
    }
  }

  export() {
    combineLatest(
      this.db.list("units").snapshotChanges(),
      this.db.list("delegates").snapshotChanges(),
      (units, delegates) => {
        return { units: units, delegates: delegates }
      }
    ).pipe(
      take(1),
      tap(
        combined => {
          let data = combined.units.map(snapshot => {
            let values = snapshot.payload.val()
            return [
              snapshot.key,
              values["delegate"],
              findName(combined.delegates, values["delegate"]),
              values["name"] || "",
              values["type"] || "",
              values["state"] || "",
              values["visibility"] || "",
              values["publicInfo"] || "",
              values["delegateInfo"] || "",
              values["internalInfo"] || ""
            ]
          })
          let options = {
            headers: ["ID jednotky", "ID hráče", "Hráč", "Název", "Typ jednotky", "Stav jednotky", "Viditelnost jednotky", "Veřejné info", "Info pro hráče", "Info pro orgy"]
          };
          new ngxCsv(data, 'Export jednotek', options);
        }
      )
    ).subscribe()
  }

  import(file) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      let papa = new Papa()
      papa.parse(fileReader.result as string, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          result.data.forEach(el => {
            if (el["ID jednotky"] == "") {
              this.db.list("units").push({
                name: el["Název"],
                delegate: el["ID hráče"],
                publicInfo: el["Veřejné info"],
                delegateInfo: el["Info pro hráče"],
                internalInfo: el["Info pro orgy"],
                type: el["Typ jednotky"],
                state: el["Stav jednotky"],
                visibility: el["Viditelnost jednotky"]
              })
            } else {
              this.db.object("units/" + el["ID jednotky"]).update({
                name: el["Název"],
                delegate: el["ID hráče"],
                publicInfo: el["Veřejné info"],
                delegateInfo: el["Info pro hráče"],
                internalInfo: el["Info pro orgy"],
                type: el["Typ jednotky"],
                state: el["Stav jednotky"],
                visibility: el["Viditelnost jednotky"]
              })
            }
          });
        }
      })
    }
    fileReader.readAsText(file.value.files[0]);
  }

}

function findName(snapshots: AngularFireAction<DatabaseSnapshot<any>>[], id: string) {
  let snapshot = snapshots.find((row) => row.key == id);
  if (snapshot == null) {
    return "N/A"
  }
  return snapshot.payload.val()["name"]
}
